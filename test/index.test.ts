import { afterEach, assert, describe, expect, test } from "vitest";

import type Redis from "ioredis";

import MockRedis from "ioredis-mock";

import { createPrismaRedisCache } from "../src";

// Create the mock Redis instance we need
// Do some funky shit to get TypeScript to be happy 😫
const mockRedis: unknown = new MockRedis();
const redis = mockRedis as Redis;

afterEach(async () => {
  await redis.flushall();
});

// Do some setup stuff
const dbValue = { key: "test result" };
const model1 = "User";
const model2 = "Post";
const action1 = "findUnique";
const action2 = "findFirst";

describe.each<{
  args: { where: { foo: string } };
  cacheTime: number;
  cacheKey1: string;
  cacheKey2: string;
  next: () => Promise<typeof dbValue>;
}>([
  {
    args: { where: { foo: "bar" } },
    cacheTime: 2000, // 2 seconds
    cacheKey1: `${model1}~{"params":{"action":"${action1}","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"${model1}","runInTransaction":false}}`,
    cacheKey2: `${model2}~{"params":{"action":"${action2}","args":{"where":{"foo":"bar"}},"dataPath":[],"model":"${model2}","runInTransaction":false}}`,
    next: () => Promise.resolve(dbValue),
  },
])("createPrismaRedisCache function", ({ args, cacheTime, cacheKey1, cacheKey2, next }) => {
  test("should cache a single Prisma model", async () => {
    const middleware = createPrismaRedisCache({
      cacheTime,
      storage: { type: "redis", options: { client: redis } },
    });

    // Run a "fake" User Prisma query
    await middleware(
      {
        args,
        action: action1,
        model: model1,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Test if the data exists in the cache
    expect(JSON.parse((await redis.get(cacheKey1)) as string)).toMatchObject(dbValue);
  });

  test("should cache multiple Prisma models in cache", async () => {
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
        action: action1,
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
        action: action2,
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
    const customCacheKey = "Article";
    const cacheKey = `${customCacheKey}~{"params":{"action":"${action1}","args":{"where":{"foo":"bar"}},"dataPath":[],"model":${customCacheKey},"runInTransaction":false}}`;

    const middleware = createPrismaRedisCache({
      models: [{ model: model1, cacheKey: customCacheKey }],
      storage: { type: "redis", options: { client: redis } },
      cacheTime,
    });

    // Run a "fake" User Prisma query
    await middleware(
      {
        args,
        action: action1,
        model: model1,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Test if the query was skipped and does not exist in cache
    assert.equal(JSON.parse((await redis.get(cacheKey)) as string), null);
  });

  test("should exclude Prisma action from being cached with individual model excludeMethods", async () => {
    const middleware = createPrismaRedisCache({
      models: [{ model: model1, cacheTime, excludeMethods: [action1] }],
      storage: { type: "redis", options: { client: redis } },
      cacheTime,
    });

    // Run a "fake" Post Prisma query
    await middleware(
      {
        args,
        action: action2,
        model: model2,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Run a "fake" User Prisma query
    await middleware(
      {
        args,
        action: action1,
        model: model1,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Test if the query was skipped and does not exist in cache
    assert.equal(JSON.parse((await redis.get(cacheKey1)) as string), null);
    expect(JSON.parse((await redis.get(cacheKey2)) as string)).toMatchObject(dbValue);
  });

  test("should exclude a Prisma method from being cached with default excludeMethods", async () => {
    const middleware = createPrismaRedisCache({
      models: [{ model: model1 }],
      storage: { type: "redis", options: { client: redis } },
      cacheTime,
      excludeMethods: [action1],
    });

    // Run a "fake" User Prisma query
    await middleware(
      {
        args,
        action: action1,
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
        action: action2,
        model: model2,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Test if the query was skipped and does not exist in cache
    assert.equal(JSON.parse((await redis.get(cacheKey1)) as string), null);
    // Test that (non-excluded) queries are still cached
    expect(JSON.parse((await redis.get(cacheKey2)) as string)).toMatchObject(dbValue);
  });

  test("should exclude a Prisma model from being cached with excludeModels", async () => {
    const middleware = createPrismaRedisCache({
      storage: { type: "redis", options: { client: redis } },
      cacheTime,
      excludeModels: [model1],
    });

    // Run a "fake" User Prisma query
    await middleware(
      {
        args,
        action: action1,
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
        action: action2,
        model: model2,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Test if the Model was skipped and does not exist in cache
    assert.equal(JSON.parse((await redis.get(cacheKey1)) as string), null);
    // Make sure that other (non-excluded) models are still cached
    expect(JSON.parse((await redis.get(cacheKey2)) as string)).toMatchObject(dbValue);
  });

  test("should invalidate a single Prisma model cache after data mutation", async () => {
    const middleware = createPrismaRedisCache({
      storage: { type: "redis", options: { client: redis, invalidation: true } },
      cacheTime,
    });

    // Run a "fake" User Prisma query
    await middleware(
      {
        args,
        action: action1,
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
        action: action2,
        model: model2,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Test if data exists in the cache
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
    // Test that we keep other cached queries that shouldn't be cleared
    expect(JSON.parse((await redis.get(cacheKey2)) as string)).toMatchObject(dbValue);
  });

  test("should invalidate a Prisma model cache and related Prisma models after data mutation", async () => {
    const middleware = createPrismaRedisCache({
      models: [
        {
          model: model1,
          invalidateRelated: [model2],
        },
      ],
      storage: { type: "redis", options: { client: redis, invalidation: true } },
      cacheTime,
    });

    // Run a "fake" User Prisma query
    await middleware(
      {
        args,
        action: action1,
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
        action: action2,
        model: model2,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Test if data exists in the cache
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
    assert.equal(JSON.parse((await redis.get(cacheKey2)) as string), null);
  });

  test("should not invalidate a Prisma model if cache method is excluded", async () => {
    const middleware = createPrismaRedisCache({
      storage: { type: "redis", options: { client: redis, invalidation: true } },
      cacheTime,
      excludeMethods: ["findFirst"],
    });

    // Run a "fake" User Prisma query
    await middleware(
      {
        args,
        action: action1,
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
        action: action2,
        model: model2,
        dataPath: [],
        runInTransaction: false,
      },
      next,
    );

    // Test if the cached query was fetched from the cache
    expect(JSON.parse((await redis.get(cacheKey1)) as string)).toMatchObject(dbValue);
    // Test that the excluded cache method was not cached
    assert.equal(JSON.parse((await redis.get(cacheKey2)) as string), null);
  });
});
