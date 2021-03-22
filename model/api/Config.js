const {
    GraphQLObjectType,
    GraphQLString
} = require('graphql');

const Config = new GraphQLObjectType({
    name: 'Config',
    fields: {
        name: {
            type: GraphQLString,
            resolve(source, args, context, info) {
                source.name;
            }
        },
        avatar: {
            type: GraphQLString,
            resolve(source, args, context, info) {
                source.avatar;
            }
        },
        password: {
            type: GraphQLString,
            resolve(source, args, context, info) {
                source.password;
            }
        }
    }
});

module.exports = Config;