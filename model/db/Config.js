module.exports = class Config {
    constructor(db) {
        this.collection = db.collection('Config');
    }

    /**
     * async fun
     * @returns {object[]}
     */
    async query() {
        const cursor = this.collection.find({});
        if (await cursor.hasNext()) {
            return await cursor.next();
        }
        return undefined;
    }

    /**
     * async fun
     * @param {string} name
     * @returns {boolean} is updated
     */
    async update({ name, avatar, password }) {
        const updater = {};
        if (name !== undefined) {
            updater.name = name;
        }
        if (avatar !== undefined) {
            updater.avatar = avatar;
        }
        if (password !== undefined) {
            updater.password = password;
        }
        return (await this.collection.updateOne({}, { $set: updater })).modifiedCount;
    }
}