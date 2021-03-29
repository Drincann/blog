const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
} = require('graphql');

const TagType = require('./type/Tag');
const ArticleType = require('./type/Article');
const ConfigType = require('./type/Config');
const CountType = require('./type/Count');

const {
    getPassword,
    client,
    collections: {
        articleCollection: articles,
        tagCollection: tags,
        articlesToTagsCollection: articlesToTags,
        configCollection: configs
    }
} = require('../db');

const { ObjectId } = require('mongodb');

module.exports = new GraphQLObjectType({
    name: 'blogMutation',
    fields: {
        createArticle: {
            type: ArticleType,
            args: {
                title: { type: new GraphQLNonNull(GraphQLString) },
                content: { type: new GraphQLNonNull(GraphQLString) },
                tagIdList: { type: new GraphQLList(GraphQLString) },
                tagNameList: { type: new GraphQLList(GraphQLString) },
                token: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve: async (source, { title, content, tagIdList, tagNameList, token }, ctx) => {
                // 验证
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }
                // 开启事务
                const session = client.startSession();
                try {
                    // 下方统一返回 upserted
                    let upserted = 1;
                    await session.withTransaction(async () => {
                        // tagIdList 存在则使用，否则使用 tagNameList 连表查询 id
                        if (tagIdList) {
                            tagIdList = tagIdList.map(_id => ObjectId(_id))
                        } else if (tagNameList) {
                            tagIdList =
                                (await Promise.all(tagNameList.map(async (tagName) => (await tags.findOne({ name: tagName }))?._id)))
                                    .filter((tagId) => {
                                        if (!tagId) {
                                            throw new Error('指定的 tag 不存在')
                                        }
                                        return true;
                                    });
                        } else {
                            tagIdList = [];
                        }

                        // 开始插入操作
                        if (!title || !content) {
                            throw new Error('必须提供 title 和 content 参数');
                        }
                        // 插文章
                        const { ops } = await (await articles.insertOne({ title, content, createAt: Date.now(), updateAt: Date.now() }, { session }));
                        upserted = ops[0];

                        // 插文章到标签的关系
                        await articlesToTags.insertMany(tagIdList.map(tag => ({ tag, article: upserted._id })), { session });
                    });
                    return upserted;
                } finally {
                    await session.endSession();
                }
            }
        },
        updateArticle: {
            type: ArticleType,
            args: {
                _id: { type: new GraphQLNonNull(GraphQLString) },
                title: { type: GraphQLString },
                content: { type: GraphQLString },
                tagIdList: { type: new GraphQLList(GraphQLString) },
                tagNameList: { type: new GraphQLList(GraphQLString) },
                token: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve: async (source, { _id, title, content, tagIdList, tagNameList, token }, ctx) => {
                // 验证
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }
                // 开启事务
                const session = client.startSession();
                try {
                    // 返回 upserted
                    let upserted = null;
                    await session.withTransaction(async () => {
                        // 修改 title content updateAt 操作
                        const updateId = (await articles.updateOne({ _id: _id }, {
                            title, content,
                            updateAt: Date.now(),
                        }.removeNull())).upsertedId;

                        // 修改 tag article 关系
                        // 统一处理 tagIdList，tagIdList 存在则使用，否则使用 tagNameList 连表查询 id 生成 tagIdList
                        if (tagIdList) {
                            tagIdList = tagIdList.map(_id => ObjectId(_id))
                        } else if (tagNameList) {
                            tagIdList =
                                (await Promise.all(tagNameList.map(async (tagName) => (await tags.findOne({ name: tagName }))?._id)))
                                    .filter((tagId) => {
                                        if (!tagId) {
                                            throw new Error('指定的 tag 不存在')
                                        }
                                        return true;
                                    });
                        }
                        if (tagIdList) {
                            // 删掉所有对应关系然后重新插入关系
                            await articlesToTags.deleteMany({ article: ObjectId(_id) }, { session });
                            await articlesToTags.insertMany(tagIdList.map((tag) => ({ article: _id, tag })), { session });
                            upserted = articles.findOne({ _id: updateId });
                        }
                    });
                    return upserted;
                } finally {
                    await session.endSession();
                }
            }
        },
        delArticle: {
            type: CountType,
            args: {
                _id: { type: new GraphQLNonNull(GraphQLString) },
                token: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve: async (source, { _id, token }, ctx) => {
                // 验证
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }
                // 开启事务
                const session = client.startSession();
                try {
                    // 下方统一返回 upserted
                    let count = 0;
                    await session.withTransaction(async () => {
                        // 删除 article 操作
                        count = (await articles.deleteOne({ _id }, { session })).deletedCount
                        if (count >= 1) {
                            // 删掉  Tag  Article 关系
                            await articlesToTags.deleteMany({ article: ObjectId(_id) }, { session });
                        }
                    });
                    return { count };
                } finally {
                    await session.endSession();
                }
            }
        },
        createTag: {
            type: TagType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                token: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve: async (source, { name, token }, ctx) => {
                // 验证
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }
                // 增加
                const upserted = (await tags.insertOne({ name: name })).ops[0];
                return upserted;
            }
        },
        updateTag: {
            type: TagType,
            args: {
                _id: { type: new GraphQLNonNull(GraphQLString) },
                name: { type: new GraphQLNonNull(GraphQLString) },
                token: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve: async (source, { _id, name, token }, ctx) => {
                // 验证
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }
                // 修改
                const upsertedId = (await tags.updateOne({ _id }, { $set: { name } })).upsertedId;
                return await tags.findOne({ _id: upsertedId });
            }
        },
        delTag: {
            type: CountType,
            args: {
                _id: { type: GraphQLString },
                name: { type: GraphQLString },
                token: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve: async (source, { _id, name, token }, ctx) => {
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }
                if (!_id && !name) {
                    throw new Error('必须提供 _id 或 name 参数');
                }
                // 删除
                const count = (await tags.deleteOne({ _id, name }.removeNull())).deletedCount;
                return { count };
            }
        },
        updateConfig: {
            type: ConfigType,
            args: {
                name: { type: GraphQLString },
                avatar: { type: GraphQLString },
                password: { type: GraphQLString },
                profile: { type: GraphQLString },
                token: { type: GraphQLString },
            },
            resolve: async (source, { name, avatar, password, token }, ctx) => {
                // 验证
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }
                const updater = { name, avatar, password }.removeNull();
                await configs.updateOne({}, { $set: updater });
                return await configs.findOne({});
            }
        }
    }
})