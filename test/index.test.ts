import MockRedis from "ioredis-mock";
import { test, expect, afterEach, assert } from "vitest";
import { createPrismaRedisCache } from "../src";

import type Redis from "ioredis";

// Create the mock Redis instance we need
// Do some funky shit to get TypeScript to be happy 😫
const mockRedis: unknown = new MockRedis();
const redis = mockRedis as Redis;

tap.afterEach(async () => {
  await redis.flushall();
});

// function createMockQuery({ args, action, model, datapath, runInTransaction }) {}

tap.test("should get and set a single Prisma model in Redis cache", async ({ equal }) => {
  // Do some setup stuff
  const dbValue = "test result";
  const model = "User";
  const action = "findUnique";
  const args = { where: { foo: "bar" } };
  const defaultCacheTime = 2000; // 2 seconds
  const cacheKey = `${model}:${action}:${JSON.stringify(args)}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [{ model: "User" }],
    defaultCacheTime,
    storage: { type: "redis", options: { client: redis } },
  });

  // Run a "fake" User Prisma query
  await middleware(
    {
      args,
      action,
      model,
      dataPath: [],
      runInTransaction: false,
    },
    next,
  );

  // Test if the data exists in the cache
  equal(JSON.parse((await redis.get(cacheKey)) as string), dbValue);
});

// tap.test("should get and set multiple Prisma models in Redis cache", async ({ equal }) => {
//   // Do some setup stuff
//   const dbValue = "result";
//   const model1 = "User";
//   const model2 = "Post";
//   const action = "findUnique";
//   const args = { where: { foo: "bar" } };
//   const cacheTime = 2000; // 2 seconds
//   const cacheKey1 = `${model1}:${action}:${JSON.stringify(args)}`;
//   const cacheKey2 = `${model2}:${action}:${JSON.stringify(args)}`;
//   const next = () => Promise.resolve(dbValue);

//   const middleware = createPrismaRedisCache({
//     models: [model1, model2],
//     redis,
//     cacheTime,
//   });

//   // Run a "fake" User Prisma query
//   await middleware(
//     {
//       args,
//       action,
//       model: model1,
//       dataPath: [],
//       runInTransaction: false,
//     },
//     next,
//   );

//   // Run a "fake" Post Prisma query
//   await middleware(
//     {
//       args,
//       action,
//       model: model2,
//       dataPath: [],
//       runInTransaction: false,
//     },
//     next,
//   );

//   // Test if the data exists in the cache
//   equal(JSON.parse((await redis.get(cacheKey1)) as string), dbValue);
//   equal(JSON.parse((await redis.get(cacheKey2)) as string), dbValue);
// });

// tap.test("should exclude Prisma Action from being cached in Redis cache", async ({ equal }) => {
//   // Do some setup stuff
//   const dbValue = "result";
//   const model = "User";
//   const action = "findFirst";
//   const args = { where: { foo: "bar" } };
//   const cacheTime = 2000; // 2 seconds
//   const cacheKey = `${model}:${action}:${JSON.stringify(args)}`;
//   const next = () => Promise.resolve(dbValue);

//   const middleware = createPrismaRedisCache({
//     models: [model],
//     redis,
//     cacheTime,
//     excludeCacheMethods: [action],
//   });

//   // Run a "fake" User Prisma query
//   await middleware(
//     {
//       args,
//       action,
//       model,
//       dataPath: [],
//       runInTransaction: false,
//     },
//     next,
//   );

//   // Test if the query was skipped and does not exist in cache
//   equal(JSON.parse((await redis.get(cacheKey)) as string), null);
// });

// tap.test("should invalidate cache after data mutation", async ({ equal }) => {
//   // Do some setup stuff
//   const dbValue = "result";
//   const model = "User";
//   const action = "findFirst";
//   const args = { where: { foo: "bar" } };
//   const cacheTime = 2000; // 2 seconds
//   const cacheKey = `${model}:${action}:${JSON.stringify(args)}`;
//   const next = () => Promise.resolve(dbValue);

//   const middleware = createPrismaRedisCache({
//     models: [model],
//     redis,
//     cacheTime,
//   });

//   // Run a "fake" User Prisma query
//   await middleware(
//     {
//       args,
//       action,
//       model,
//       dataPath: [],
//       runInTransaction: false,
//     },
//     next,
//   );

//   // Test if data exists in the Redis cache
//   equal(JSON.parse((await redis.get(cacheKey)) as string), dbValue);

//   // Run a "fake" User Prisma mutation
//   await middleware(
//     {
//       args,
//       action: "create",
//       model,
//       dataPath: [],
//       runInTransaction: false,
//     },
//     next,
//   );

//   // Test if the cache was invalidated and cleared properly
//   equal(JSON.parse((await redis.get(cacheKey)) as string), null);
// });
