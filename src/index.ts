import { createCache } from "async-cache-dedupe";

import { defaultCacheMethods } from "./cacheMethods";

import type {
  CreatePrismaRedisCache,
  Middleware,
  MiddlewareParams,
  PrismaAction,
  FetchFromPrisma,
  Result,
} from "./types";

export const createPrismaRedisCache = ({
  models,
  defaultCacheTime = 0,
  storage = { type: "memory" },
  excludeCacheModels = [],
  defaultExcludeCacheMethods = [],
  onError,
  onHit,
  onMiss,
  onDedupe,
}: CreatePrismaRedisCache) => {
  // Default options for "async-cache-dedupe"
  const cacheOptions = {
    ttl: defaultCacheTime,
    storage,
    onError,
    onHit,
    onMiss,
    onDedupe,
  };

  // Do not cache any Prisma method specified in the defaultExcludeCacheMethods option
  const excludedCacheMethods: PrismaAction[] = defaultCacheMethods.filter((cacheMethod) => {
    return !defaultExcludeCacheMethods.includes(cacheMethod);
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
      models?.forEach(({ model, cacheTime, cacheKey }) => {
        // Only define the cache function for a model if it doesn't exist yet and hasn't been excluded
        if (!cache[model] && !excludeCacheModels?.includes(model)) {
          cache.define(
            model,
            {
              ttl: cacheTime || cacheOptions.ttl,
              references: ({ params }: { params: MiddlewareParams }, key: string, result: Result) => {
                return result ? [`${cacheKey || params.model}~${key}`] : null;
              },
            },
            async function modelsFetch({ cb, params }: { cb: FetchFromPrisma; params: MiddlewareParams }) {
              result = await cb(params);

              return result;
            },
          );
        }
      });

      // Define a cache function for any Prisma model that wasn't explicitly defined in `models`
      // Only define the cache function for a model if it doesn't exist yet and hasn't been excluded
      if (!cache[params.model] && !excludeCacheModels?.includes(params.model)) {
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
    if (!excludeCacheModels?.includes(params.model) && excludedCacheMethods?.includes(params.action)) {
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
