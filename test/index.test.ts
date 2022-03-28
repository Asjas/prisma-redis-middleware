import MockRedis from "ioredis-mock";
import { test, expect, afterEach, assert } from "vitest";
import { createPrismaRedisCache } from "../src";

import type Redis from "ioredis";

// Create the mock Redis instance we need
// Do some funky shit to get TypeScript to be happy 😫
const mockRedis: unknown = new MockRedis();
const redis = mockRedis as Redis;

afterEach(async () => {
  await redis.flushall();
});

test("should cache a single Prisma model", async () => {
  // Do some setup stuff
  const dbValue = { key: "test result" };
  const model = "User";
  const action = "findUnique";
  const args = { where: { foo: "bar" } };
  const defaultCacheTime = 2000; // 2 seconds
  const cacheKey = `User~{"params":{"action":"findUnique","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"User","runInTransaction":false}}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
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
  expect(JSON.parse((await redis.get(cacheKey)) as string)).toMatchObject(dbValue);
});

test("should cache multiple Prisma models in cache", async () => {
  // Do some setup stuff
  const dbValue = { key: "test result" };
  const model1 = "User";
  const model2 = "Post";
  const action = "findUnique";
  const args = { where: { foo: "bar" } };
  const cacheTime = 2000; // 2 seconds
  const cacheKey1 = `User~{"params":{"action":"findUnique","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"User","runInTransaction":false}}`;
  const cacheKey2 = `Post~{"params":{"action":"findUnique","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"Post","runInTransaction":false}}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [
      { model: model1, cacheTime },
      { model: model2, cacheTime },
    ],
    storage: { type: "redis", options: { client: redis } },
  });

  // Run a "fake" User Prisma query
  await middleware(
    {
      args,
      action,
      model: model1,
      dataPath: [],
      runInTransaction: false,
    },
    next,
  );

  // Run a "fake" Post Prisma query
  await middleware(
    {
      args,
      action,
      model: model2,
      dataPath: [],
      runInTransaction: false,
    },
    next,
  );

  // Test if the data exists in the cache
  expect(JSON.parse((await redis.get(cacheKey1)) as string)).toMatchObject(dbValue);
  expect(JSON.parse((await redis.get(cacheKey2)) as string)).toMatchObject(dbValue);
});

test("should use custom cacheKey when caching a Prisma model", async () => {
  // Do some setup stuff
  const dbValue = { key: "test result" };
  const model = "Post";
  const action = "findFirst";
  const args = { where: { foo: "bar" } };
  const defaultCacheTime = 2000; // 2 seconds
  const customCacheKey = "Article";
  const cacheKey = `${customCacheKey}~{"params":{"action":"findFirst","args":{"where":{"foo":"bar"}},"dataPath":[],"model":${customCacheKey},"runInTransaction":false}}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [{ model, cacheKey: customCacheKey }],
    storage: { type: "redis", options: { client: redis } },
    defaultCacheTime,
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

  // Test if the query was skipped and does not exist in cache
  assert.equal(JSON.parse((await redis.get(cacheKey)) as string), null);
});

test("should exclude Prisma action from being cached with excludeCacheMethods", async () => {
  // Do some setup stuff
  const dbValue = { key: "test result" };
  const model = "User";
  const action = "findFirst";
  const args = { where: { foo: "bar" } };
  const defaultCacheTime = 2000; // 2 seconds
  const cacheKey = `User~{"params":{"action":"findFirst","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"User","runInTransaction":false}}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [{ model, excludeCacheMethods: [action] }],
    storage: { type: "redis", options: { client: redis } },
    defaultCacheTime,
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

  // Test if the query was skipped and does not exist in cache
  assert.equal(JSON.parse((await redis.get(cacheKey)) as string), null);
});

test("should exclude Prisma method from beign cached with defaultExcludeCacheMethods", async () => {
  // Do some setup stuff
  const dbValue = { key: "test result" };
  const model = "User";
  const action = "findFirst";
  const args = { where: { foo: "bar" } };
  const defaultCacheTime = 2000; // 2 seconds
  const cacheKey = `User~{"params":{"action":"findFirst","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"User","runInTransaction":false}}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [{ model }],
    storage: { type: "redis", options: { client: redis } },
    defaultCacheTime,
    defaultExcludeCacheMethods: [action],
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

  // Test if the query was skipped and does not exist in cache
  assert.equal(JSON.parse((await redis.get(cacheKey)) as string), null);
});

test("should exclude Prisma model from being cached with defaultExcludeCacheModels", async () => {
  // Do some setup stuff
  const dbValue = { key: "test result" };
  const model = "User";
  const action = "findFirst";
  const args = { where: { foo: "bar" } };
  const defaultCacheTime = 2000; // 2 seconds
  const cacheKey = `User~{"params":{"action":"findFirst","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"User","runInTransaction":false}}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    storage: { type: "redis", options: { client: redis } },
    defaultCacheTime,
    defaultExcludeCacheModels: [model],
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

  // Test if the query was skipped and does not exist in cache
  assert.equal(JSON.parse((await redis.get(cacheKey)) as string), null);
});

test("should invalidate a single Prisma model cache after data mutation", async () => {
  // Do some setup stuff
  const dbValue = { key: "test result" };
  const model1 = "User";
  const model2 = "Post";
  const action = "findUnique";
  const args = { where: { foo: "bar" } };
  const defaultCacheTime = 2000; // 2 seconds
  const cacheKey1 = `User~{"params":{"action":"findUnique","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"User","runInTransaction":false}}`;
  const cacheKey2 = `Post~{"params":{"action":"findUnique","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"Post","runInTransaction":false}}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    storage: { type: "redis", options: { client: redis, invalidation: true } },
    defaultCacheTime,
  });

  // Run a "fake" User Prisma query
  await middleware(
    {
      args,
      action,
      model: model1,
      dataPath: [],
      runInTransaction: false,
    },
    next,
  );

  // Run a "fake" Post Prisma query
  await middleware(
    {
      args,
      action,
      model: model2,
      dataPath: [],
      runInTransaction: false,
    },
    next,
  );

  // Test if data exists in the Redis cache
  expect(JSON.parse((await redis.get(cacheKey1)) as string)).toMatchObject(dbValue);
  expect(JSON.parse((await redis.get(cacheKey2)) as string)).toMatchObject(dbValue);

  // Run a "fake" User Prisma mutation
  await middleware(
    {
      args,
      action: "create",
      model: model1,
      dataPath: [],
      runInTransaction: false,
    },
    next,
  );

  // Test if the cache was invalidated and cleared properly
  assert.equal(JSON.parse((await redis.get(cacheKey1)) as string), null);
  expect(JSON.parse((await redis.get(cacheKey2)) as string)).toMatchObject(dbValue);
});
