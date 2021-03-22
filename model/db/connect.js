const MongoClient = require('mongodb').MongoClient;

/**
 * async fun
 * @param {string} dbUrl 
 * @returns {MongoClient} 数据库客户端
 */
module.exports = (dbUrl, callback) => {

    // Create a new MongoClient
    const client = new MongoClient(dbUrl, { useUnifiedTopology: true });

    // Connect to the Server
    client.connect(callback ?? undefined);

    //  todo 删掉这里
    async () => {
        this.collection = client.db().collection();
        let name;
        this.collection.insertMany({})
        const result = await this.collection.updateOne({},)
        result.modifiedCount
        return Promise((resolve, reject) => {
            this.collection.insertOne({ name }, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result.insertedId)
            });
        });
    }

    return client;
};

