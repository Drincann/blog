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
        profile: {
            type: GraphQLString,
            resolve: (source) => source.profile
        },
        password: {
            type: GraphQLString,
            resolve: async (source, args, ctx) => {
                // 验证
                if (!ctx.auth) {
                    throw new Error('没有操作权限');
                }
                return source.password;
            }
        }
    }
});

module.exports = Config;