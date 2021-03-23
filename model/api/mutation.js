const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
} = require('graphql');

const TagType = require('./type/Tag');
const ArticleType = require('./type/Article');
const ConfigType = require('./type/Config');

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
        article: {
            type: ArticleType,
            args: {
                _id: { type: GraphQLString },
                title: { type: GraphQLString },
                content: { type: GraphQLString },
                tagIdList: { type: new GraphQLList(GraphQLString) },
                tagNameList: { type: new GraphQLList(GraphQLString) },
                token: { type: GraphQLString },
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

                        if (_id) {
                            // 修改操作
                            const updateId = (await articles.updateOne({ _id: _id }, {
                                title, content,
                                updateAt: Date.now(),
                            }.removeNull())).upsertedId;
                            // 删掉所有对应关系然后重新插入关系
                            await articlesToTags.deleteMany({ article: ObjectId(_id) }, { session });
                            await articlesToTags.insertMany(tagIdList.map((tag) => ({ article: _id, tag })), { session });
                            upserted = articles.findOne({ _id: updateId });
                        } else {
                            // 插入操作
                            if (!title || !content) {
                                throw new Error('必须提供 title 和 content 参数');
                            }
                            // 插文章
                            const { ops } = await (await articles.insertOne({ title, content, createAt: Date.now(), updateAt: Date.now() }, { session }));
                            upserted = ops[0];

                            // 插文章到标签的关系
                            await articlesToTags.insertMany(tagIdList.map(tag => ({ tag, article: _id })), { session });
                        }
                    });
                    return upserted;
                } finally {
                    await session.endSession();
                }
            }
        },
        tag: {
            type: TagType,
            args: {
                _id: { type: GraphQLString },
                name: { type: GraphQLString },
                token: { type: GraphQLString },
            },
            resolve: async (source, { _id, name, token }, ctx) => {
                // 验证
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }
                let upserted = null;
                if (_id) {
                    if (name) {
                        // 修改
                        const upsertedId = (await tags.updateOne({ _id: _id }, { $set: { name: name } })).upsertedId;
                        upserted = tags.findOne({ _id: upsertedId });
                    }
                } else {
                    if (name) {
                        // 增加
                        upserted = (await tags.insertOne({ name: name })).ops[0];
                    }
                }
                return upserted;
            }
        },
        config: {
            type: ConfigType,
            args: {
                name: { type: GraphQLString },
                avatar: { type: GraphQLString },
                password: { type: GraphQLString },
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