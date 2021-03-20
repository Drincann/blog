const log = require('../util/logger');

module.exports = async (ctx, next) => {
    let start = Date.now();
    await next();
    log.info(`${ctx.method} ${ctx.url} ${Date.now() - start} ms`);
};