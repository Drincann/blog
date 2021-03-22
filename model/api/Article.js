const {
    GraphQLObjectType,
    GraphQLString, GraphQLInt, GraphQLList
} = require('graphql');

const {
    articlesToTags, tags
} = require('../db');

const TagType = require('./Tag');

const Article = new GraphQLObjectType({
    name: 'Article',
    fields: {
        title: {
            type: GraphQLString,
            resolve(source) {
                return source.title;
            }
        },
        content: {
            type: GraphQLString,
            resolve(source) {
                return source.content;
            }
        },
        createAt: {
            type: GraphQLInt,
            resolve(source) {
                return source.createAt;
            }
        },
        updateAt: {
            type: GraphQLInt,
            resolve(source) {
                return source.updateAt;
            }
        },
        tag: {
            type: new GraphQLList(TagType),
            async resolve(source) {
                const { _id: articleId } = source;

                // 连表查询
                return (await articlesToTags.query({ articleId }))
                    .map(async ({ tag }) => (await tags.query({ tagId: tag }))[0]);
            }
        }
    }
});

module.exports = Article;