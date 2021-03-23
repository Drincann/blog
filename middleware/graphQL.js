const Router = require('../util/router');
const graphqlApi = require('../model/api');

let router = new Router();

router.post('/graphql', async (ctx) => {
    ctx.body = await graphqlApi(ctx.request.body, { koaCtx: ctx });
});

module.exports = router.middleware();