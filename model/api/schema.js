const {
    GraphQLSchema, GraphQLObjectType,
    GraphQLString,
    GraphQLList,
} = require('graphql');

const TagType = require('./Tag');
const ArticleType = require('./Article');
const ConfigType = require('./Config');

const { tags, articles, configs, articlesToTags } = require('../db');
const Article = require('./Article');

// export schema
module.exports = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'blogQuery',
        fields: {
            articles: {
                type: new GraphQLList(ArticleType),
                args: {
                    articleId: {
                        type: GraphQLString
                    },
                    tagId: {
                        type: GraphQLString
                    },
                    tagName: {
                        type: GraphQLString
                    }
                },
                resolve: async (source, { articleId, tagId, tagName }, context, info) => {
                    if (articleId) {
                        return await articles.query({ articleId });
                    } else if (tagId || tagName) {
                        const condition = {};
                        if (tagId) {
                            condition.tagId = tagId;
                        }
                        if (tagName) {
                            condition.tagName = tagName;
                        }
                        const tagList = await tags.query(condition);
                        if (tagList.length) {
                            return (await articlesToTags.query({ tagId: tagList[0]._id }))
                                .map(async ({ article }) => {
                                    const articleList = await articles.query({ articleId: article });
                                    if (articleList.length) {
                                        return articleList[0];
                                    }
                                });
                        }
                        return [];
                    }
                }
            },
            tags: {
                type: new GraphQLList(TagType),
                args: {
                    tagId: {
                        type: GraphQLString
                    },
                    tagName: {
                        type: GraphQLString
                    }
                },
                resolve: async (source, { tagId, tagName }, context) => {
                    const condition = {};
                    if (tagId) {
                        condition.tagId = tagId;
                    }
                    if (tagName) {
                        condition.tagName = tagName;
                    }
                    return await tags.query(condition);
                }
            }
        }
    })
});