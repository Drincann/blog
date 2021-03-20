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