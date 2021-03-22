
const koa = require('koa');
const log = require('./util/logger')
const app = new koa();

/**
 * env
 */

// log req
app.use(require('./middleware/responseTime'));


/**
 * production
 */

// ETag - 304
app.use(require('./util/setETag')());

// static
app.use(require('./util/static')('./public', {
    cache: false, index: 'index.html', bubbling: false
}));

// bodyParser
app.use(require('./util/bodyParser')());


// graphQL interface
app.use(require('./middleware/graphQL'));

// 404
app.use((ctx) => {
    ctx.status = 404;
    ctx.body = `${ctx.url} not found`;
});

app.on('error', err => {
    log.error('server error', err)
});

app.listen(80);