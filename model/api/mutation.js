const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
} = require('graphql');

const TagType = require('./type/Tag');
const ArticleType = require('./type/Article');
// const ConfigType = require('./type/Config');

const {
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
                articleId: { type: GraphQLString },
                title: { type: GraphQLString },
                content: { type: GraphQLString },
                tagIdList: { type: new GraphQLList(GraphQLString) },
                tagNameList: { type: new GraphQLList(GraphQLString) }
            },
            resolve: async (source, { articleId, title, content, tagIdList, tagNameList }) => {
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
                                    .filter(() => { throw new Error('指定的 tag 不存在') });
                        } else {
                            tagIdList = [];
                        }

                        if (articleId) {
                            // 修改操作
                            const updateId = (await articles.updateOne({ _id: articleId }, {
                                title, content,
                                updateAt: Date.now(),
                            }.removeNull())).upsertedId;
                            // 删掉所有对应关系然后重新插入关系
                            await articlesToTags.deleteMany({ article: ObjectId(articleId) });
                            await articlesToTags.insertMany(tagIdList.map((tag) => ({ article: articleId, tag })));
                            upserted = articles.findOne({ _id: updateId });
                        } else {
                            // 插入操作
                            if (!title || !content) {
                                throw new Error('必须提供 title 和 content 参数');
                            }
                            // 插文章
                            const { ops } = await (await articles.insertOne({ title, content, createAt: Date.now(), updateAt: Date.now() }));
                            upserted = ops[0];

                            // 插文章到标签的关系
                            await articlesToTags.insertMany(tagIdList.map(tag => ({ tag, article: articleId })));
                        }
                    });
                    return upserted;
                } finally {
                    await session.endSession();
                }
            }
        },
        tags: {
            type: new GraphQLList(TagType),
            args: {
                tagId: { type: GraphQLString },
                tagName: { type: GraphQLString }
            },
            resolve: async (source, { tagId, tagName }) => {
                const condition = {};
                if (tagId) {
                    condition._id = tagId;
                }
                if (tagName) {
                    condition.name = tagName;
                }
                return await tags.find(condition).toArray();
            }
        }
    }
})