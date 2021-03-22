const { ObjectId } = require('mongodb');

module.exports = class Article {
    constructor(db) {
        this.collection = db.collection('Article');
    }

    /**
     * async fun
     * @param {string} articleId
     * @returns 
     */
    async query({ articleId: _id }) {
        const condition = {};
        if (_id !== undefined) {
            condition._id = ObjectId(_id);
        }
        return await this.collection.find(condition).toArray();
    }

    /**
     * async fun
     * @param {string} title
     * @param {string} content
     * @param {number} createAt
     * @param {number} updateAt
     * @returns id
     */
    async insert({ title, content, createAt, updateAt }) {
        return (await this.collection.insertOne({ title, content, createAt, updateAt })).insertedId;
    }

    /**
     * async fun
     * @param {string} articleId
     * @param {string} title
     * @param {string} content
     * @param {number} createAt
     * @param {number} updateAt
     * @returns {boolean} is updated
     */
    async update({ articleId: _id, title, content, createAt, updateAt }) {
        const updater = {};
        if (title !== undefined) {
            updater.title = title;
        }
        if (content !== undefined) {
            updater.content = content;
        }
        if (createAt !== undefined) {
            updater.createAt = createAt;
        }
        if (updateAt !== undefined) {
            updater.updateAt = updateAt;
        }

        return (await this.collection.updateOne({ _id: ObjectId(_id) }, { $set: updater })).modifiedCount;
    }

    /**
     * async fun
     * @param {string} articleId
     * @returns {boolean} is deleted
     */
    async del({ articleId: _id }) {
        return (await this.collection.deleteOne({ _id: ObjectId(_id) })).deletedCount;
    }
}