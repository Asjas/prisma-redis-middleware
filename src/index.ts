import Redis from "ioredis";
import debug from "debug";

export type PrismaMutationAction =
  | "create"
  | "createMany"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "executeRawUnsafe";
export type PrismaQueryAction =
  | "findFirst"
  | "findUnique"
  | "findMany"
  | "aggregate"
  | "count"
  | "groupBy"
  | "queryRaw";
export type PrismaAction = PrismaMutationAction | PrismaQueryAction;
export type RedisOptions = Redis.Redis;

/**
 * These options are being passed in to the middleware as "params"
 * https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#params
 */
export type MiddlewareParams = {
  model?: any;
  action: PrismaAction;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

// https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#use
export type Middleware<T = any> = (params: any, next: (params: any) => Promise<T>) => Promise<T>;

// eslint-disable-next-line
debug("prisma-redis-middleware");

function log(message: string) {
  debug.log(`[prisma:redis:middleware][DEBUG] ${message}`);
}

const defaultCacheMethods: PrismaQueryAction[] = [
  "findUnique",
  "findFirst",
  "findMany",
  "queryRaw",
  "aggregate",
  "count",
  "groupBy",
];

const defaultMutationMethods: PrismaMutationAction[] = [
  "create",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "executeRawUnsafe",
];

async function getCache({ cacheKey, params, redis }: { cacheKey: string; params: any; redis: Redis.Redis }) {
  let result: Record<string, unknown>;

  try {
    const cacheItem = await redis.get(cacheKey);

    if (cacheItem) {
      log(`${params.action} on ${params.model} was found in the cache with key ${cacheKey}.`);
      result = JSON.parse(cacheItem);

      return result;
    }
  } catch (err) {
    console.error(err); // eslint-disable-line no-console
  }

  return null;
}

async function setCache({
  cacheKey,
  cacheTime,
  result,
  redis,
  params,
}: {
  cacheKey: string;
  cacheTime: number;
  result: any;
  params: any;
  redis: Redis.Redis;
}) {
  try {
    await redis.setex(cacheKey, cacheTime, JSON.stringify(result));

    log(`caching ${params.action} on ${params.model} with key ${cacheKey}.`);
  } catch (err) {
    console.error(err); // eslint-disable-line no-console
  }
}

async function invalidateCache({
  model,
  redis,
  params,
}: {
  model: PrismaMutationAction;
  params: any;
  redis: Redis.Redis;
}) {
  try {
    const keys = await redis.keys(`${model}:*`);

    if (keys.length) {
      const deletedKeys = await redis.del(keys);
      log(
        `${params.action} on ${params.model} caused ${deletedKeys} ${
          keys.length > 1 ? "keys" : "key"
        } to be deleted from cache.`,
      );

      return;
    }

    log(`${keys.length} keys found in the cache to invalidate for ${params.action} on ${params.model}.`);
  } catch (err) {
    console.error(err); // eslint-disable-line no-console
  }
}

export default function createPrismaRedisCache({
  models,
  cacheTime,
  redis,
  excludeCacheMethods = [],
}: {
  models: any;
  cacheTime: number;
  redis: Redis.Redis;
  excludeCacheMethods?: PrismaQueryAction[];
}) {
  return async function prismaCacheMiddleware(params: MiddlewareParams, next: (params: any) => Promise<any>) {
    // Filter out any default cache methods specified in the params
    // so that we can have a flexible cache
    const excludedCacheMethods = defaultCacheMethods.filter((cacheMethod) => excludeCacheMethods.includes(cacheMethod));

    let result: Record<string, unknown> | null;

    // If the middleware models includes the model used in the query
    // AND the cache method hasn't been excluded
    // AND the Prisma action isn't a mutation action
    // we can then retrieve it from the cache or cache it if it doesn't exist
    if (
      models.includes(params.model) &&
      !excludedCacheMethods.includes(params.action as PrismaQueryAction) &&
      !defaultMutationMethods.includes(params.action as PrismaMutationAction)
    ) {
      const args = JSON.stringify(params.args);

      // We need to create a cache that contains enough information to cache the data correctly
      // The cache key looks like this: User_findUnique_{"where":{"email":"alice@prisma.io"}} or User_findMany
      const cacheKey = `${params.model}:${params.action}${args ? `:${args}` : null}`;

      // Try to retrieve the data from the cache first
      result = await getCache({ cacheKey, params, redis });

      if (result == null) {
        log(`${params.action} on ${params.model} with key ${cacheKey} was not found in the cache.`);
        log(`fetching query ${params.action} on ${params.model} from Prisma.`);

        // Fetch result from Prisma DB
        result = await next(params);

        // Set the cache with our queryKey and DB result
        await setCache({ cacheKey, cacheTime, result, redis, params });
      }
    } else {
      // Any Prisma action not defined or excluded above will fall through to here
      log(`caching query ${params.action} on ${params.model} is skipped.`);
      result = await next(params);
    }

    // Invalidate all cached queries after a mutation
    // This is a basic invalidation method that invalidates
    // all queries for a particular model ie. User or Post.
    if (defaultMutationMethods.includes(params.action as PrismaMutationAction)) {
      await invalidateCache({ model: params.model, redis, params });
    }

    // We will either return the result from the cache or the database here
    return result;
  };
}
