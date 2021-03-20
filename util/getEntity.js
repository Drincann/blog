const fs = require('fs');
fs.stat = require('util').promisify(fs.stat);

module.exports = async (body) => {
    if (body instanceof require('stream')) {
        if (body.path) {
            body = await fs.stat(body.path);
        } else {
            body = undefined;
        }
    } else if (!typeof body === 'string' || !Buffer.isBuffer(body)) {
        body = JSON.stringify(body);
    }
    return body;
}