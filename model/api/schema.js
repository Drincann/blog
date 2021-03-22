const { GraphQLSchema } = require('graphql');

// export schema
module.exports = new GraphQLSchema({
    query: require('./query'),
    mutation: require('./mutation'),
});