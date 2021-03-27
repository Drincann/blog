# 博客后端开发记录

## 2021.03.18

下定决心写个博客后端了。

暂定技术栈 koa + mongodb。

正好学一下号称下一代 web 框架的 koa，看看人家的 api 风格，框架特性啥的，为后面的框架开发做个准备。

还有熟悉一下 mongodb 的 node.js api，之前一直用的社区玄学包 mongoose。

### 模型

配置，用来动态控制一些单例数据

例如渲染到网站上的名字、头像、介绍等内容

| Config   |        |            |
| -------- | ------ | ---------- |
| name     | string | 名称       |
| avatar   | binary | 头像       |
| password | string | 管理用密码 |

文章

| Article  |          |                    |
| -------- | -------- | ------------------ |
| content  | string   | 文章内容           |
| createAt | number   | 创建时间戳         |
| updateAt | number   | 最近一次更新时间戳 |
| tag      | objectid | 文章标签           |

标签

| Tag  |        |          |
| ---- | ------ | -------- |
| name | string | 标签名称 |

评论使用 Valine



### 进度

今天简单读了 koa 的文档，了解了部分生态，看起来 koa 是一个非常干净的框架，几乎仅实现了中间件，没有多余内容。基本上主要功能 —— 例如路由、静态资源 —— 都是由社区提供的。

今天简单实现了一个 koa 的 router：

```js
class Router {
    constructor() {
        this.getRouteMap = new Map();
        this.postRouteMap = new Map();
    }

    get(route, func) {
        this.getRouteMap.set(route.trim(), func);
    }

    post(route, func) {
        this.postRouteMap.set(route.trim(), func);

    }

    middleware() {
        return (async (ctx, next) => {
            if (ctx.method == 'GET') {
                if (this.getRouteMap.has(ctx.url)) {
                    return await this.getRouteMap.get(ctx.url)(ctx);
                }
            } else if (ctx.method == 'POST') {
                if (this.postRouteMap.has(ctx.url)) {
                    return await this.postRouteMap.get(ctx.url)(ctx);
                }
            }
            next();
        }).bind(this);
    }
}

module.exports = Router;
```

还简单设计了一下数据模型。





## 2021.03.19

今天考虑了一些，打算使用 GraphQL，重新设计一下数据模型。

### 模型

配置，用来动态控制一些单例数据

例如渲染到网站上的名字、头像、介绍等内容

| Config   |        |            |
| -------- | ------ | ---------- |
| name     | string | 名称       |
| avatar   | binary | 头像       |
| password | string | 管理用密码 |

文章

| Article  |        |                    |
| -------- | ------ | ------------------ |
| title    | string | 文章标题           |
| content  | string | 文章内容           |
| createAt | number | 创建时间戳         |
| updateAt | number | 最近一次更新时间戳 |

标签

| Tag  |        |          |
| ---- | ------ | -------- |
| name | string | 标签名称 |

文章到标签（多对多，方便查询）

| ArticleToTag |          |            |
| ------------ | -------- | ---------- |
| article      | objectid | 文章id     |
| tag          | objectid | 文章标签id |

评论使用 Valine



### 进度

#### 实现了静态资源访问

实现可配置的静态资源中间件存在几个需要注意的问题：

- 首先是 `HEAD` 和 `GET`，在 HTTP 请求中，它们具有相同的语义。

- 是否等待下游中间件返回后访问静态资源，这作为一个可选项暴露在参数中。

- 注意不要覆盖已有的处理结果，

  ```js
  if (ctx.body != null || ctx.status !== 404) return;
  ```

- 恶意行为，使用 `resolve-path` 包来避免恶意访问。

  ```js
  path = resolvePath(config.root, ctx.path.replace(new RegExp('^/'), ''));
  ```

  正则替换掉绝对路径 `/`，用于不触发这个包的绝对路径异常。

- 访问的默认文件，作为参数暴露。触发时机是：当前访问的是目录。

- 是否进行 304 响应（Conditional Requests），作为参数暴露。使用 `Cache-Control`、`Last-Modified`、`If-Modified-Since` 机制实现。

  仔细来讲，`Cache-Control` 头用来向客户端响应，告知是否允许缓存，置为 `maxAge=0` 或 `no-cache`。

  然后将 `Last-Modified` 设置为 `stats.mtime.toUTCString()`。

  HTTP 协议要求客户端在下次访问时带上 `If-Modified-Since`，用来想服务端提示上次响应时服务端给的时间。

  在服务端可以这样实现相关逻辑：

  ```js
  let modifiedTime = ctx.get('If-Modified-Since');
  if (modifiedTime) {
      if (stats.mtime.toUTCString() === modifiedTime) {
          return ctx.status = 304;
      }
  }
  ```

参考 `@koajs/static`，`@koajs/send`。

全部代码：

```js
const fs = require('fs');
const _path = require('path');
const resolvePath = require('resolve-path');

/**
 * opts:
 *  - index = 'index.html' 默认文件
 *  - bubbling = false 是否在冒泡阶段处理
 *  - cache = false 启用客户端缓存，进行 304 响应
 */
module.exports = (root, opts = {}) => {
    let config = {
        root: _path.resolve(root),
        index: opts.index ?? 'index.html',
        bubbling: opts.defer ?? false,
        cache: opts.cache ?? false,
    };

    return async (ctx, next) => {
        if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return await next();
        if (config.bubbling) {
            // 等待其后中间件处理
            await next();
        }

        // 已有中间件处理则返回 
        if (ctx.body != null || ctx.status !== 404) return;

        // 拼接、检测恶意行为
        let path;
        try {
            path = resolvePath(config.root, ctx.path.replace(new RegExp('^/'), ''));
        } catch (error) {
            return await next();
        }

        // 获取 stat
        let stats;
        try {
            stats = fs.statSync(path);
            if (stats.isDirectory()) {
                // 是目录且启用了 index 则加上 index
                if (config.index) {
                    path += `\\${config.index}`
                    stats = fs.statSync(path);
                }
            }
        } catch (error) {
            // 出错，交给下游处理
            return await next();
        }

        ctx.set('Content-Length', stats.size);
        if (config.cache) {
            ctx.set('Last-Modified', stats.mtime.toUTCString());
            ctx.set('Cache-Control', 'no-cache');

            let modifiedTime = ctx.get('If-Modified-Since');
            if (modifiedTime) {
                if (stats.mtime.toUTCString() === modifiedTime) {
                    return ctx.status = 304;
                }
            }
        }

        ctx.type = _path.extname(path);
        ctx.body = fs.createReadStream(path);
    }
}
```

#### 实现了 ETag

ETag 是上述 Conditional Requests 的新方案，在 HTTP/1.1 标准中定义。

其本质思想是针对任何（主要是静态资源）响应实体进行 hash，拿到一个数据摘要，作为响应头 `ETag`。客户端被要求实现：每次请求都带着最新的 `ETag`。

然后服务端通过比对进行响应。

这个方案的性能会差一点，但是解决了先前的弊端，例如 `Last-Modified` 精确到秒，对于频繁更改的响应实体无法有效频繁响应。

可以使用 `@jshttp/etag` ，同时 `koa` 实现了 `etag` 的对比逻辑，其上下文对象的 `fresh` 属性的 `getter` 实现如下：

```js
/**
   * Check if the request is fresh, aka
   * Last-Modified and/or the ETag
   * still match.
   *
   * @return {Boolean}
   * @api public
   */

get fresh() {
    const method = this.method;
    const s = this.ctx.status;

    // GET or HEAD for weak freshness validation only
    if ('GET' !== method && 'HEAD' !== method) return false;

    // 2xx or 304 as per rfc2616 14.26
    if ((s >= 200 && s < 300) || 304 === s) {
        return fresh(this.header, this.response.header);
    }

    return false;
},
```

参考 `@koajs/conditional-get`、`@koajs/etag`。

全部代码：

```js
module.exports = (opts) => {
    return async (ctx, next) => {
        await next();

        // 2xx statusCode
        if ((ctx.status / 100 | 0) !== 2) return;

        let entity = await require('./util/getEntity')(ctx.body);
        if (entity) {
            ctx.etag = require('etag')(entity, opts);
            if (ctx.fresh) {
                ctx.body = null;
                ctx.status = 304;
            }
        }
    };
};
```





## 2021.03.20

早上准备写 body parser 的时候发现 post 请求一直匹配不到中间件，后来发现是静态资源的中间件在非 `HEAD`、`GET` 请求下忘记调用 next，此外，为了保证正常的中间件冒泡行为，`return next()` 应改为 `return await next()`，已经更正在前面的代码中。

#### 进度

实现了最基本的 bodyParser，没有解析压缩后数据的能力，且仅将 json 处理为 object。

参考 `@koajs/bodyparser`、`@cojs/co-body` 、`@stream-utils/raw-body`、`@stream-utils/inflation` 和內建的模块 `zlib`，用来进行编码解码。

以后可以直接基于 `co-body` 这个层来进行较为底层的 bodyParser 定制。

完整代码：

```js
const log = require('./logger');

module.exports = ({ limit } = {}) => {
    return async (ctx, next) => {
        limit = limit ?? 0B100000000000000000; // 128 kb
        if (ctx.get('content-length') > limit) {
            log.error(new Error('request entity too large'))
        } else {
            try {
                let raw = await getBody(ctx.req, limit);
                try {
                    // 尝试解析为 json
                    ctx.request.body = JSON.parse(raw);
                } catch (error) {
                    ctx.request.body = raw;
                }
            } catch (error) {
                log.error(error);
            }
        }
        await next();
    };
};

/**
 * receive data
 * @param {request} req
 * @param {number} limit
 */
function getBody(req, limit) {
    let data = '';
    let receivedLength = 0;
    return new Promise((resolve, reject) => {
        req.on('data', chunk => {
            data += chunk.toString();
            receivedLength += chunk.length;
            if (receivedLength > limit) {
                reject(new Error('request entity too large'));
                req.removeAllListeners();
            }
        });

        req.on('end', () => {
            resolve(data);
        });

        req.on('error', (error) => {
            reject(error);
            req.removeAllListeners();
        });
    });
}
```

在设计 graphql api 的时候遇到困难，尤其是在组合数据库层和 graphql 层的时候。

第一个困难是，数据库连接是异步的，我直接返回一个 async func，这导致外层在获取时也需要 async func 包装。

貌似只能这样处理，但如果从底层就开始异步，会导致所有上层模块都需要 async func 包装，虽然不麻烦，但是很难受。

第二个困难是，数据库查询接口层的设计，目前我是对每个表设计一个类，对外提供单例，单例上有原子查询接口。

这两个层需要对接，在这记录一下，





## 2021.03.21

#### 难点

mongodb 的 connect api 是异步的，这会导致一个很严重的问题。

由于 connect 会异步 resolve db 对象，而其后所有查询都依赖该对象，想要在模块化中获得该对象，只有在内部进行异步的同步包装，在外部进行异步的同步等待。

这导致从 db 模块开始到所有依赖，这些模块都需要进行包装。

但 mongoose 并没有这种要求，看了一眼 api，他是在他内部的全局作用域下维护一个 db 实例。这比较好理解，这里猜测是对 db 实例直接进行异步赋值，并不同步等待数据库的连接。其后所有数据库操作直接针对这个可能没赋值的 db 实例进行操作，一会翻一下他的源码看看。

#### 进度

搞定了数据层的原子行为，但是没有做任何非法操作的判断，例如 delete 行为的 condition 置空将会删表，正在考虑在接口层做还是在数据层做。

还有，上边写的难点是我看错了，被自己封装的接口迷惑了，实际上人家虽然是完全异步的，但允许提前同步拿到一些实例，需要时再调入内存。

目前整体路由及中间件架构已经确定，完成了部分 graphql 查询，发现数据层接口有点问题，缺少直接返回单个结果的接口，让上传的代码有些臃肿，所以明天改一下。





## 2021.03.22

#### 进度

发现数据层没必要做封装，graphql 层越写需求越多，封装的数据层接口反而限制发挥，直接提供 mongodb api 给 graphql 层调用就好了。

之所以做出这个决定，是因为在插入文章的时候需要用到事务。然后发现事务不能在 mongodb 单点服务端上使用，必须配置副本集、或集群（分片），于是配置了一波副本集。

今天还学了一波 mutation，发现跟 query 几乎没有任何区别，仅作为提供语义。



## 2021.03.23

#### 进度

mongodb 穷人版不支持中文文本索引，我看实现全文检索的最佳方式是配合 Elasticsearch，暂时留个 todo，先使用 mongodb 自带的文本索引，考虑文章量小的情况下直接正则匹配，留个接口，之后再折腾。

准备实现身份认证，由于是单用户，不考虑 session、jwt 了，准备手动设计一个非常简单的机制。

目前是这样想的，对特权接口，要求传递 token 参数，前端使用 localstorage 存储 token，状态交给前端保持，后端没有认证耦合，这有那么一丢丢类似 jwt（就一丢丢）。



## GraphQL 接口文档

### 类型

```
type Tag {
    _id,
    name
}

type Article {
    title: string,
    content: string,
    createAt: number,
    updateAt: number,
    tag: Tag[]
}

type Config {
    name: string,
    password: string,
    avatar: string
}
```



### QuerySchema

#### 单个文章查询

```
query {
    article(
        _id: string,
        text: string,
        tagId: sting,
        tagName: string
    ): Article
}
```

#### 多个文章查询

```
query {
    articles(
        _id: string,
        text: string,
        tagId: sting,
        tagName: string
    ): Article[]
}
```

#### 单个标签查询

```
query {
    tag(
        _id: string,
        name: string
    ): Tag
}
```

#### 多个标签查询

```
query {
    tags(
        _id: string,
        name: string
    ): Tag[]
}
```

#### 网站配置查询

要获取 password 字段时需要传入 token，否则会报错，该 token 的值是当前 password。

```
query {
    config(
        token: string
    ): Config
}
```



### MutationSchema

#### 单个文章修改/添加

该接口是特权接口，需要传入 token 参数。

修改和添加取决于是否指定了 _id，若指定则语义为修改，否则为添加。

修改时，所有参数可选。

添加时，title 和 content 必选，tagNameList 和 tagIdList 可选，选择时为二选一。

```
mutation {
    article(
        _id: string,
        title: string,
        content: string,
        tagIdList: string[],
        tagNameList: string[],
        token: string
    ): Article
}
```

#### 单个标签修改/添加

该接口是特权接口，需要传入 token 参数。

修改和添加取决于是否指定了 _id，若指定则语义为修改，否则为添加。

修改时，所有参数可选。

添加时，name 必选。

```
mutation {
    tag(
        _id: string,
        name: string
    ): Tag
}
```

#### 网站配置更改

该接口是特权接口，需要传入 token 参数。

token 必选，其余可选。

```
mutation {
    config(
        name: string,
        avatar: string,
        password: string,
        token: string
    ): Config
}
```



#### 