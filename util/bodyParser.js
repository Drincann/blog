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