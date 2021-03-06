const {
    GraphQLObjectType,
    GraphQLString
} = require('graphql');

const Tag = new GraphQLObjectType({
    name: 'Tag',
    fields: {
        _id: {
            type: GraphQLString,
            resolve: (source) => source._id
        },
        name: {
            type: GraphQLString,
            resolve: (source) => source.name
        }
    }
});

module.exports = Tag;