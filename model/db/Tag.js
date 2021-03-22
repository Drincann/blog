const { ObjectId } = require('mongodb');

module.exports = class Tag {
    constructor(db) {
        this.collection = db.collection('Tag');
    }

    /**
     * async fun
     * @param {string} tagId
     * @param {string} tagName
     * @returns {object[]}
     */
    async query({ tagId: _id, tagName: name }) {
        const condition = {};
        if (_id !== undefined) {
            condition._id = ObjectId(_id);
        }
        if (name !== undefined) {
            condition.name = name;

        }

        return await this.collection.find(condition).toArray();
    }

    /**
     * async fun
     * @param {string} tagName
     * @returns {string} id
     */
    async insert({ tagName: name }) {
        return (await this.collection.insertOne({ name })).insertedId;
    }

    /**
     * async fun
     * @param {string} tagId
     * @param {string} oldName
     * @param {string} newName
     * @returns {boolean} is updated
     */
    async update({ tagId: _id, oldName, newName }) {
        const condition = {};
        if (_id !== undefined) {
            condition._id = ObjectId(_id);
        }
        if (oldName !== undefined) {
            condition.name = oldName;
        }
        return (await this.collection.updateOne(condition, { $set: { name: newName } })).modifiedCount;
    }

    /**
     * async fun
     * @param {string} tagName
     * @returns {boolean} is deleted
     */
    async del({ tagId: _id, tagName: name }) {
        const condition = {};
        if (_id !== undefined) {
            condition._id = ObjectId(_id);
        }
        if (name !== undefined) {
            condition.name = name;
        }
        return (await this.collection.deleteOne(condition)).deletedCount;
    }
}