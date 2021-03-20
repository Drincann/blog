const Router = require('../util/router');

let router = new Router();

router.post('/hello', async ctx => {
    ctx.body = 'hello';
});

module.exports = router.middleware();