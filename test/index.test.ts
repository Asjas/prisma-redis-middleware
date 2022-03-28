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

