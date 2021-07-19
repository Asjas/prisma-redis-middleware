import Redis from "ioredis";

export type PrismaAction =
  | "findUnique"
  | "findFirst"
  | "findMany"
  | "create"
  | "createMany"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "executeRaw"
  | "queryRaw"
  | "aggregate"
  | "count"
  | "groupBy";

/**
 * These options are being passed in to the middleware as "params"
 * https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#params
 */
type ModelName = "";

export type MiddlewareParams = {
  model?: ModelName;
  action: PrismaAction;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

// https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#use
export type Middleware<T = any> = (
  params: MiddlewareParams,
  next: (params: MiddlewareParams) => Promise<T>,
) => Promise<T>;

export function createPrismaRedisCache({ model, cacheTime }, opts) {
  return async function prismaCacheMiddleware(
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => Promise<any>,
  ) {
    const redis = new Redis({ host: opts.REDIS_HOST, port: opts.REDIS_PORT });
    let result;

    if (
      params.model === model &&
      ["findUnique", "findFirst", "findMany", "queryRaw", "aggregate", "count", "groupBy"].includes(params.action)
    ) {
      const args = JSON.stringify(params.args);

      // We need to create a cache that contains enough information to cache the data correctly
      // The cache key looks like this: User_findUnique_{"where":{"email":"alice@prisma.io"}}
      const cacheKey = `${params.model}_${params.action}_${args}`;
      console.log(cacheKey);

      // Try to retrieve the data from the cache first
      result = JSON.parse(await redis.get(cacheKey));
      console.log("result found in cache", result);

      if (result === null) {
        result = await next(params);

        // Set the cache with our query
        await redis.setex(cacheKey, cacheTime, JSON.stringify(result));
        console.log("manually return result and update cache", result);
      }
    } else {
      // Any Prisma action not defined will fall through to here
      console.log("getting into the else handler", result);
      result = await next(params);
    }

    return result;
  };
}
