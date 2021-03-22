const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
} = require('graphql');

const TagType = require('./type/Tag');
const ArticleType = require('./type/Article');
// const ConfigType = require('./type/Config');

const { collections: {
    articleCollection: articles,
    tagCollection: tags,
    articlesToTagsCollection: articlesToTags,
    configCollection: configs
} } = require('../db');

const { ObjectId } = require('mongodb');

module.exports = new GraphQLObjectType({
    name: 'blogQuery',
    fields: {
        article: {
            type: ArticleType,
            args: {
                articleId: { type: GraphQLString },
                text: { type: GraphQLString },
                tagId: { type: GraphQLString },
                tagName: { type: GraphQLString }
            },
            resolve: async (source, { articleId, text, tagId, tagName }) => {
                if (articleId) {
                    return await articles.findOne({ _id: ObjectId(articleId) });
                } else if (tagId || tagName || text) {
                    // 根据 tag text 找文章
                    const tagCondition = {};
                    if (tagId) {
                        tagCondition._id = tagId;
                    }
                    if (tagName) {
                        tagCondition.name = tagName;
                    }

                    const tag = await tags.findOne(tagCondition);
                    if (tag) {
                        return (await Promise.all((await articlesToTags.find({ tag: ObjectId(tag._id) }).limit(1).toArray())
                            .map(async ({ article }) => await articles.findOne({ _id: ObjectId(article), $text: { $search: text } }))))
                            .filter(isNotNull => isNotNull);
                    }
                    return null;
                } else {
                    return await articles.findOne({});
                }
            }
        },
        articles: {
            type: new GraphQLList(ArticleType),
            args: {
                articleId: { type: GraphQLString },
                text: { type: GraphQLString },
                tagId: { type: GraphQLString },
                tagName: { type: GraphQLString }
            },
            resolve: async (source, { articleId, text, tagId, tagName }) => {
                if (articleId) {
                    return await articles.find({ _id: ObjectId(articleId) }).toArray();
                } else if (tagId || tagName || text) {
                    // 根据 tag text 找文章
                    const tagCondition = {};
                    if (tagId) {
                        tagCondition._id = tagId;
                    }
                    if (tagName) {
                        tagCondition.name = tagName;
                    }
                    const tag = await tags.findOne(tagCondition);
                    if (tag) {
                        // 根据 tagId 查所有文章 Id
                        return (await Promise.all((await articlesToTags.find({ tag: ObjectId(tag._id) }).toArray())
                            // 根据所有文章 Id 查文章内容，同时通过 text 搜索
                            .map(async ({ article }) => await articles.findOne({ _id: ObjectId(article), $text: { $search: text } }))))
                            // 过滤空值
                            .filter(isNotNull => isNotNull);
                    }
                    return [];
                } else {
                    return await articles.find({}).toArray();
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
});