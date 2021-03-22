const {
    GraphQLObjectType,
    GraphQLString
} = require('graphql');

const Tag = new GraphQLObjectType({
    name: 'Tag',
    fields: {
        tagId: {
            type: GraphQLString,
            resolve(source) {
                return source._id;
            }
        },
        name: {
            type: GraphQLString,
            resolve(source) {
                return source.name;
            }
        }
    }
});

module.exports = Tag;