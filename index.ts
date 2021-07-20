import Redis from "ioredis";
import debug from "debug";

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
// type ModelName = "";

// export type MiddlewareParams = {
//   model?: ModelName;
//   action: PrismaAction;
//   args: any;
//   dataPath: string[];
//   runInTransaction: boolean;
// };

// https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#use
// export type Middleware<T = any> = (params: any, next: (params: any) => Promise<T>) => Promise<T>;

debug("prisma-redis-middleware");

function log(message: string) {
  debug.log(`[prisma:redis:middleware][DEBUG] ${message}`);
}

export function createPrismaRedisCache({ model, cacheTime }, opts) {
  return async function prismaCacheMiddleware(params: any, next: (params: any) => Promise<any>) {
    const redis = new Redis({ host: opts.REDIS_HOST, port: opts.REDIS_PORT, password: opts.REDIS_AUTH });
    let result;

    if (
      params.model === model &&
      ["findUnique", "findFirst", "findMany", "queryRaw", "aggregate", "count", "groupBy"].includes(params.action)
    ) {
      const args = JSON.stringify(params.args);

      // We need to create a cache that contains enough information to cache the data correctly
      // The cache key looks like this: User_findUnique_{"where":{"email":"alice@prisma.io"}}
      const cacheKey = `${params.model}_${params.action}_${args}`;

      // Try to retrieve the data from the cache first
      result = JSON.parse(await redis.get(cacheKey));
      log(`${params.action} on ${params.model} was found in the cache with key ${cacheKey}.`);

      if (result === null) {
        result = await next(params);

        // Set the cache with our query
        await redis.setex(cacheKey, cacheTime, JSON.stringify(result));
        log(`${params.action} on ${params.model} was not found in the cache.`);
        log(`Caching action ${params.action} on ${params.model} with key ${cacheKey}.`);
      }
    } else {
      // Any Prisma action not defined above will fall through to here
      log(`${params.action} on ${params.model} is skipped.`);
      result = await next(params);
    }

    return result;
  };
}
