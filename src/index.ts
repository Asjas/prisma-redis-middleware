import { createCache } from "async-cache-dedupe";
import stringify from "safe-stable-stringify";

import { defaultCacheMethods, defaultMutationMethods } from "./cacheMethods";

import type { CreatePrismaRedisCache, MiddlewareParams, PrismaQueryAction, PrismaMutationAction } from "./types";

export const createPrismaRedisCache = ({
  models,
  defaultCacheTime = 0,
  storage = { type: "memory" },
  defaultExcludeCacheMethods,
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

  // Do not filter any Prisma method specified in the defaultExcludeCacheMethods option
  const excludedCacheMethods = defaultCacheMethods.filter((cacheMethod) =>
    defaultExcludeCacheMethods?.includes(cacheMethod),
  );

  const cache = createCache(cacheOptions);

  // Add a cache function for every model specified in the models option
  models?.forEach(({ model, primaryKey, cacheTime }) => {
    cache.define(
      model,
      {
        ttl: cacheTime || cacheOptions.ttl,
        references: (_args: any, _key: string, result: any) => [model, `model-${primaryKey || result.id}`],
      },
      (result: any) => result,
    );
  });

  return async function prismaCacheMiddleware(params: MiddlewareParams, next: (params: any) => Promise<any>) {
    let result: Record<string, unknown> | null;

    //   const cacheKey = `${params.model}:${params.action}${args ? `:${args}` : null}`;

    // Cache all models by default if none are specified and does not exist yet as a cache function.
    if (!models && !cache[params.model]) {
      cache.define(
        params.model,
        {
          references: (_args: any, _key: string, result: any) => {
            const args = stringify(params.args);
            console.log("inside result", result);
            console.log([params.model, `${params.model}:${result.id}:${args}`]);
            return [params.model, `${params.model}:${result.id}:${args}`];
          },
        },
        (result: [Record<string, unknown>]) => result,
      );
    }

    // Get cache function relating to the model
    const cacheFunction = cache[params.model];

    let cacheResults;

    try {
      cacheResults = await cacheFunction();
    } catch (err) {
      console.error(err);
    }

    console.log("cache results", cacheResults);

    result = null;

    result = await next(params);

    if (
      !excludedCacheMethods.includes(params.action as PrismaQueryAction) &&
      !defaultMutationMethods.includes(params.action as PrismaMutationAction)
    ) {
      await cacheFunction(result);
    }

    return result;

    // // Invalidate all cached queries after a mutation
    // // This is a basic invalidation method that invalidates
    // // all queries for a particular model ie. User or Post.
    // if (defaultMutationMethods.includes(params.action as PrismaMutationAction)) {
    //   await cache.invalidate(result?.id);
    // }
  };
};
