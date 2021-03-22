const { ObjectId } = require('mongodb');

module.exports = class ArticleToTag {
    constructor(db) {
        this.collection = db.collection('ArticleToTag');
    }

    /**
     * sync fun
     * @param {string} tagId
     * @param {string} articleId
     * @returns {object[]}
     */
    async query({ tagId: tag, articleId: article }) {
        const condition = {};
        if (tag !== undefined) {
            condition.tag = ObjectId(tag);
        }
        if (article !== undefined) {
            condition.article = ObjectId(article);
        }

        return await this.collection.find(condition).toArray();
    }

    /**
     * async fun
     * @param {string} tagId
     * @param {string} articleId
     * @returns inserted id
     */
    async insert({ tagId: tag, articleId: article }) {
        return (await this.collection.insertOne({ tag: ObjectId(tag), article: ObjectId(article) })).insertedId;
    }

    /**
     * async fun
     * @param {string} tagId
     * @param {string} articleId
     * @returns del count
     */
    async del({ tagId: tag, articleId: article, _id }) {
        const condition = {};
        if (tag !== undefined) {
            condition.tag = ObjectId(tag);
        }
        if (article !== undefined) {
            condition.article = ObjectId(article);
        }
        if (_id !== undefined) {
            condition._id = ObjectId(_id);
        }
        return (await this.collection.deleteMany(condition)).deletedCount;
    }
}

