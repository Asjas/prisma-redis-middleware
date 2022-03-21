import { createCache } from "async-cache-dedupe";

import { defaultCacheMethods } from "./cacheMethods";

import type { CreatePrismaRedisCache, MiddlewareParams, PrismaAction } from "./types";

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

  return async function prismaCacheMiddleware(
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => Promise<any>,
  ) {
    let result: Record<string, unknown>;

    // Do not cache any method that has been excluded
    if (excludedCacheMethods?.includes(params.action)) {
      // Add a cache function for every model specified in the models option
      models?.forEach(({ model, cacheTime }) => {
        // Only define the cache function if it doesn't exist yet and hasn't been excluded
        if (!cache[model] && !excludeCacheModels?.includes(model)) {
          cache.define(
            model,
            {
              ttl: cacheTime || cacheOptions.ttl,
              references: (args: any, key: string, result: any) => {
                return result ? [`${args.model}~${key}`] : null;
              },
            },
            async (args: MiddlewareParams) => {
              result = await next(args);

              return result;
            },
          );
        }
      });

      // Add a cache function for every model that wasn't specified or excluded
      if (!cache[params.model] && !excludeCacheModels?.includes(params.model)) {
        cache.define(
          params.model,
          {
            references: (args: any, key: string, result: any) => {
              return result ? [`${args.model}~${key}`] : null;
            },
          },
          async (args: MiddlewareParams) => {
            result = await next(args);

            return result;
          },
        );
      }
    }

    // Get cache function relating to the model
    const cacheFunction = cache[params.model];

    // We cache the model if `models` is not provided to the middleware options
    // If the model has been excluded with `defaultExcludeCacheModels` we also ignore it
    if (!excludeCacheModels?.includes(params.model) && excludedCacheMethods?.includes(params.action)) {
      try {
        result = await cacheFunction(params);
      } catch (err) {
        // If we fail to fetch it from the cache (network error, etc.) we will fetch it from the database
        result = await next(params);
        console.error(err);
      }
    } else {
      // Get result from database for any Prisma action or model we exclude from the cache
      result = await next(params);
      await cache.invalidateAll(`${params.model}~*`);
    }

    return result;
  };
};
