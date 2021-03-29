const {
    GraphQLObjectType,
    GraphQLInt,
} = require('graphql');

const Count = new GraphQLObjectType({
    name: 'Count',
    fields: {
        count: {
            type: GraphQLInt,
            resolve: (source) => source._id,
        },
    }
});

module.exports = Count;