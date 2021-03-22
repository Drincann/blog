const schema = require('./schema');
const { graphql } = require('graphql');

// export graphql api
module.exports = async (body, contextValue) => {
    const { query, variables } = body;
    return await graphql({
        schema, source: query, variableValues: variables, contextValue
    });
};
