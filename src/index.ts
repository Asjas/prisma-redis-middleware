import Redis from "ioredis";

export type Action =
  | "findOne"
  | "findMany"
  | "create"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "executeRaw"
  | "queryRaw"
  | "aggregate";

/**
 * These options are being passed in to the middleware as "params"
 */
export type MiddlewareParams = {
  model?: string;
  action: Action;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

export type Middleware<T = any> = (
  params: MiddlewareParams,
  next: (params: MiddlewareParams) => Promise<T>,
) => Promise<T>;

export function createLRUCacheMiddleware({ model, cache }: { model: string; cache: LRU<string, any> }) {
  return async function prismaCacheMiddleware(
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => Promise<any>,
  ) {
    let result;

    if (params.model === model && ["findOne", "queryRaw", "aggregate", "findOne", "findMany"].includes(params.action)) {
      const args = JSON.stringify(params.args);

      const cacheKey = `${params.model}_${params.action}_${args}`;

      // Do we have a value in this cache key?
      result = cache.get(cacheKey);

      if (result === undefined) {
        result = await next(params);
        cache.set(cacheKey, result);
      }
    } else {
      result = await next(params);
    }

    return result;
  };
}
