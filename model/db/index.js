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
const Tag = require('./Tag');
const Article = require('./Article');
const Config = require('./Config');
const ArticleToTag = require('./ArticleToTag');

// instance
const tags = new Tag(db);
const articles = new Article(db);
const configs = new Config(db);
const articlesToTags = new ArticleToTag(db);

module.exports = {
    tags, articles, configs, articlesToTags
};