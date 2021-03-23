const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
} = require('graphql');

const TagType = require('./type/Tag');
const ConfigType = require('./type/Config');
const ArticleType = require('./type/Article');
// const ConfigType = require('./type/Config');

const {
    getPassword,
    collections: {
        articleCollection: articles,
        tagCollection: tags,
        articlesToTagsCollection: articlesToTags,
        configCollection: configs
    }
} = require('../db');

const { ObjectId } = require('mongodb');

module.exports = new GraphQLObjectType({
    name: 'blogQuery',
    fields: {
        article: {
            type: ArticleType,
            args: {
                _id: { type: GraphQLString },
                // todo text search
                text: { type: GraphQLString },
                tagId: { type: GraphQLString },
                tagName: { type: GraphQLString }
            },
            resolve: async (source, { _id, text, tagId, tagName }) => {
                // 依次添加 condition，最后统一检索
                const condition = {};

                if (_id) {
                    condition._id = ObjectId(_id);
                }

                if (text) {
                    condition.$text = { $search: text };
                }

                if (tagId || tagName) {
                    const tagCondition = {};
                    if (tagId) {
                        tagCondition._id = tagId;
                    }
                    if (tagName) {
                        tagCondition.name = tagName;
                    }

                    const articleIdArrSet = await Promise.all((await tags.find(tagCondition).toArray()).map(async ({ _id }) => await articlesToTags.find({ tag: _id })));
                    if (articleIdArrSet.length) {
                        // 根据 tagId 拿到符合的文章 Id
                        condition._id = { $in: [].concat(...articleIdArrSet) }
                    }
                    return [];
                }

                return await articles.find(condition).toArray();
            }
        },
        articles: {
            type: new GraphQLList(ArticleType),
            args: {
                _id: { type: GraphQLString },
                text: { type: GraphQLString },
                tagId: { type: GraphQLString },
                tagName: { type: GraphQLString }
            },
            resolve: async (source, { _id, text, tagId, tagName }) => {
                // 依次添加 condition，最后统一检索
                const condition = {};

                if (_id) {
                    condition._id = ObjectId(_id);
                }

                if (text) {
                    condition.$text = { $search: text };
                }

                if (tagId || tagName) {
                    const tagCondition = {};
                    if (tagId) {
                        tagCondition._id = tagId;
                    }
                    if (tagName) {
                        tagCondition.name = tagName;
                    }

                    const articleIdArrSet = await Promise.all((await tags.find(tagCondition).toArray()).map(async ({ _id }) => await articlesToTags.find({ tag: _id })));
                    if (articleIdArrSet.length) {
                        // 根据 tagId 拿到符合的文章 Id
                        condition._id = { $in: [].concat(...articleIdArrSet) }
                    }
                    return [];
                }

                return await articles.find(condition).toArray();
            }
        },
        tag: {
            type: TagType,
            args: {
                _id: { type: GraphQLString },
                name: { type: GraphQLString }
            },
            resolve: async (source, { _id, name }) => {
                const condition = { _id, name }.removeNull();
                return await tags.findOne(condition);
            }
        },
        tags: {
            type: new GraphQLList(TagType),
            args: {
                _id: { type: GraphQLString },
                name: { type: GraphQLString }
            },
            resolve: async (source, { _id, name }) => {
                const condition = { _id, name }.removeNull();
                return await tags.find(condition).toArray();
            }
        },
        config: {
            type: ConfigType,
            args: {
                token: { type: GraphQLString }
            },
            resolve: async (source, { token }, ctx) => {
                // 验证
                if (!ctx.auth) {
                    if (!token || token === '' || token !== await getPassword()) {
                        throw new Error('没有操作权限');
                    }
                    ctx.auth = true;
                }

                return await configs.findOne({});
            }
        }
    }
});