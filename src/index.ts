import { createCache } from "async-cache-dedupe";

import { defaultCacheMethods } from "./cacheMethods";

import type {
  CreatePrismaRedisCache,
  FetchFromPrisma,
  Middleware,
  MiddlewareParams,
  PrismaAction,
  PrismaQueryAction,
  Result,
} from "./types";

const DEFAULT_CACHE_TIME = 0;

export const createPrismaRedisCache = ({
  models,
  onDedupe,
  onError,
  onHit,
  onMiss,
  storage,
  cacheTime = DEFAULT_CACHE_TIME,
  excludeModels = [],
  excludeMethods = [],
}: CreatePrismaRedisCache) => {
  // Default options for "async-cache-dedupe"
  const cacheOptions = {
    onDedupe,
    onError,
    onHit,
    onMiss,
    storage,
    ttl: cacheTime,
  };

  // Do not cache any Prisma method specified in the defaultExcludeCacheMethods option
  const excludedCacheMethods: PrismaAction[] = defaultCacheMethods.filter((cacheMethod) => {
    return !excludeMethods.includes(cacheMethod);
  });

  const cache: any = createCache(cacheOptions);

  const middleware: Middleware = async (params, next) => {
    let result: Result;

    // This function is used by `async-cache-dedupe` to fetch data when the cache is empty
    const fetchFromPrisma: FetchFromPrisma = async (params) => {
      return next(params);
    };

    // Do not cache any Prisma method that has been excluded
    if (excludedCacheMethods?.includes(params.action)) {
      // Add a cache function for each model specified in the models option
      models?.forEach(({ model, cacheTime, cacheKey, excludeMethods }) => {
        // Only define the cache function for a model if it doesn't exist yet and hasn't been excluded
        if (
          !cache[model] &&
          !excludeModels?.includes(params.model) &&
          !excludeMethods?.includes(params.action as PrismaQueryAction)
        ) {
          cache.define(
            model,
            {
              references: ({ params }: { params: MiddlewareParams }, key: string, result: Result) => {
                return result ? [`${cacheKey || params.model}~${key}`] : null;
              },
              ttl: cacheTime || cacheOptions.ttl,
            },
            async function modelsFetch({ cb, params }: { cb: FetchFromPrisma; params: MiddlewareParams }) {
              result = await cb(params);

              return result;
            },
          );
        }
      });

      // For each defined model in `models` we check if they defined any caching methods to be excluded
      const excludedCacheMethodsInModels = models?.find(({ model, excludeMethods }) => {
        if (model === params.model && excludeMethods?.length) {
          return true;
        }

        return false;
      });

      // Do not define a cache function for any Prisma model if it already exists
      // Do not define the cache function for a model if it was excluded in `defaultExcludeCacheModels`
      // Do not define a cache function if the Prisma method was exluded in `models`
      if (
        !cache[params.model] &&
        !excludeModels?.includes(params.model) &&
        !excludedCacheMethodsInModels?.excludeMethods?.includes(params.action as PrismaQueryAction)
      ) {
        cache.define(
          params.model,
          {
            references: ({ params }: { params: MiddlewareParams }, key: string, result: Result) => {
              return result ? [`${params.model}~${key}`] : null;
            },
          },
          async function modelFetch({ cb, params }: { cb: FetchFromPrisma; params: MiddlewareParams }) {
            result = await cb(params);

            return result;
          },
        );
      }
    }

    // Get the cache function relating to the Prisma model
    const cacheFunction = cache[params.model];

    // Only cache the data if the Prisma model hasn't been excluded and if the Prisma method wasn't excluded either
    if (
      !excludeModels?.includes(params.model) &&
      excludedCacheMethods?.includes(params.action) &&
      typeof cacheFunction === "function"
    ) {
      try {
        result = await cacheFunction({ cb: fetchFromPrisma, params });
      } catch (err) {
        // If we fail to fetch it from the cache (network error, etc.) we will query it from the database
        result = await fetchFromPrisma(params);

        console.error(err);
      }
    } else {
      // Query the database for any Prisma method (mutation method) or Prisma model we excluded from the cache
      result = await fetchFromPrisma(params);

      // If we successfully executed the query we clear and invalidate the cache for the Prisma model
      await cache.invalidateAll(`${params.model}~*`);
    }

    return result;
  };

  return middleware;
};
