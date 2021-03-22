class Router {
    constructor() {
        this.getRouteMap = new Map();
        this.postRouteMap = new Map();
    }

    get(route, func) {
        this.getRouteMap.set(route.trim(), func);
    }

    post(route, func) {
        this.postRouteMap.set(route.trim(), func);

    }

    middleware() {
        return (async (ctx, next) => {
            if (ctx.method == 'GET') {
                if (this.getRouteMap.has(ctx.url)) {
                    return await this.getRouteMap.get(ctx.url)(ctx, next);
                }
            } else if (ctx.method == 'POST') {
                if (this.postRouteMap.has(ctx.url)) {
                    return await this.postRouteMap.get(ctx.url)(ctx, next);
                }
            }
            await next();
        }).bind(this);
    }
}

module.exports = Router;