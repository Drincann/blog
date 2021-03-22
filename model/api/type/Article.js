const {
    GraphQLObjectType,
    GraphQLString, GraphQLInt, GraphQLList
} = require('graphql');

const { collections: { tagCollection: tags, articlesToTagsCollection: articlesToTags } } = require('../../db');
const { ObjectId } = require('mongodb');

const TagType = require('./Tag');

const Article = new GraphQLObjectType({
    name: 'Article',
    fields: {
        title: {
            type: GraphQLString,
            resolve: (source) => source.title,
        },
        content: {
            type: GraphQLString,
            resolve: (source) => source.content
        },
        createAt: {
            type: GraphQLInt,
            resolve: (source) => source.createAt
        },
        updateAt: {
            type: GraphQLInt,
            resolve: (source) => source.updateAt
        },
        tag: {
            type: new GraphQLList(TagType),
            async resolve(source) {
                const { _id } = source;

                // 连表查询
                // 找到该文章的 tagId 列表
                const r = (await articlesToTags.find({ article: ObjectId(_id) }).toArray());
                return (await articlesToTags.find({ article: ObjectId(_id) }).toArray())
                    // 对每个 tagId 查询 name
                    .map(async ({ tag }) => (await tags.findOne({ _id: tag })));
            }
        }
    }
});

module.exports = Article;