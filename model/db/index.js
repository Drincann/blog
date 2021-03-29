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

// init
// 创建全文索引
collections.articleCollection.createIndex(
    { title: 'text', content: 'text' }
);
// 创建唯一索引
collections.tagCollection.createIndex(
    { 'name': 1 }, { unique: true }
);



// 如果网站 config 不存在，则新建一个默认的
(async () => {
    if ((await collections.configCollection.find().toArray()).length === 0) {
        await collections.configCollection.insertOne({
            password: 'gaolihai',
            name: '高厉害',
            avatar: '',
            profile: '',
        });
    }
})();

// 重用获取密码的方法
async function getPassword() {
    return (await collections.configCollection.findOne({})).password;
}


module.exports = {
    client, db, collections,
    getPassword
};