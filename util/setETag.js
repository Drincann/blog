module.exports = (opts) => {
    return async (ctx, next) => {
        await next();

        // 2xx statusCode
        if ((ctx.status / 100 | 0) !== 2) return;

        let entity = await require('./getEntity')(ctx.body);
        if (entity) {
            ctx.etag = require('etag')(entity, opts);
            if (ctx.fresh) {
                ctx.body = null;
                ctx.status = 304;
            }
        }
    };
};