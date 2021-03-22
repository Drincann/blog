const {
    GraphQLObjectType,
    GraphQLString
} = require('graphql');

const Config = new GraphQLObjectType({
    name: 'Config',
    fields: {
        name: {
            type: GraphQLString,
            resolve: (source) => source.name
        },
        avatar: {
            type: GraphQLString,
            resolve: (source) => source.avatar
        },
        password: {
            type: GraphQLString,
            resolve: (source) => source.password
        }
    }
});

module.exports = Config;