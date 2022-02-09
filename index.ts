import Redis from "ioredis";
import debug from "debug";

export type PrismaAction = "findUnique" | "findFirst" | "findMany" | "queryRaw" | "aggregate" | "count" | "groupBy";
export type RedisOptions = Redis.Redis;

/**
 * These options are being passed in to the middleware as "params"
 * https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#params
 */
export type MiddlewareParams<ModelType> = {
  model?: ModelType;
  action: PrismaAction;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

// https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#use
export type Middleware<T = any> = (params: any, next: (params: any) => Promise<T>) => Promise<T>;

debug("prisma-redis-middleware");

function log(message: string) {
  debug.log(`[prisma:redis:middleware][DEBUG] ${message}`);
}

const defaultCacheMethods: PrismaAction[] = [
  "findUnique",
  "findFirst",
  "findMany",
  "queryRaw",
  "aggregate",
  "count",
  "groupBy",
];

export function createPrismaRedisCache({
  models,
  cacheTime,
  redis,
  excludeCacheMethods = [],
}: {
  models: any;
  cacheTime: number;
  redis: Redis.Redis;
  excludeCacheMethods?: PrismaAction[];
}) {
  return async function prismaCacheMiddleware(params: MiddlewareParams<any>, next: (params: any) => Promise<any>) {
    // Filter out any default cache methods specified in the params
    // so that we can have a flexible cache
    const excludedCacheMethods = defaultCacheMethods.filter((cacheMethod: PrismaAction) =>
      excludeCacheMethods.includes(cacheMethod),
    );

    for (const model of models) {
      let result;

      // If the cached model matches the Prisma model used by the Prisma query
      // AND the cache method hasn't been excluded we can cache it
      if (model === params.model && !excludedCacheMethods.includes(params.action)) {
        const args = JSON.stringify(params.args);

        // We need to create a cache that contains enough information to cache the data correctly
        // The cache key looks like this: User_findUnique_{"where":{"email":"alice@prisma.io"}}
        const cacheKey = `${params.model}_${params.action}_${args ?? "no_args"}`;

        // Try to retrieve the data from the cache first
        result = JSON.parse(await redis.get(cacheKey));

        if (result) {
          log(`${params.action} on ${params.model} was found in the cache with key ${cacheKey}.`);
        }

        if (result == null) {
          log(`${params.action} on ${params.model} with key ${cacheKey} was not found in the cache.`);
          log(`Manually fetching query ${params.action} on ${params.model} from the Prisma database.`);

          // Fetch result from Prisma DB
          result = await next(params);

          // Set the cache with our queryKey and DB result
          await redis.setex(cacheKey, cacheTime, JSON.stringify(result));
          log(`Caching action ${params.action} on ${params.model} with key ${cacheKey}.`);
        }
      } else {
        // Any Prisma action not defined or excluded above will fall through to here
        log(`${params.action} on ${params.model} is skipped.`);
        result = await next(params);
      }

      // We will either return the result from the cache or the database here
      return result;
    }

    return null;
  };
}
