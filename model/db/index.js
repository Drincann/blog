// logger
const log = require('../../util/logger');

// Connection URL、Database Name
const { dbUrl, dbName } = require('../../config');

// Connect to the Server
const client = require('./connect')(dbUrl, err => {
    if (err) {
        return log.error('数据库连接异常', err);
    }
    log.info('数据库连接成功', dbUrl);
});
const db = client.db(dbName);

// collection
const collections = {
    tagCollection: db.collection('Tag'),
    articleCollection: db.collection('Article'),
    configCollection: db.collection('Config'),
    articlesToTagsCollection: db.collection('ArticleToTag')
}

module.exports = {
    client, db, collections
};