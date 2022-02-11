import ioredismock from "ioredis-mock";
import tap from "tap";
import { createPrismaRedisCache } from "../";

// Create the mock Redis instance we need
const redis = new ioredismock();

tap.test("should get and set items in Redis cache", async ({ equal }) => {
  // Do some setup stuff
  const dbValue = "result";
  const model = "User";
  const action = "findUnique";
  const args = { where: { foo: "bar" } };
  const cacheTime = 1000;
  const cacheKey = `${model}:${action}:${JSON.stringify(args)}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [model],
    redis,
    cacheTime,
  });

  // Run a "fake" Prisma database call
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
  equal(JSON.parse(await redis.get(cacheKey)), dbValue);
});

tap.test("should exclude Prisma Action from being cached in Redis cache", async ({ equal }) => {
  // Do some setup stuff
  const dbValue = "result";
  const model = "User";
  const action = "findFirst";
  const args = { where: { foo: "bar" } };
  const cacheTime = 1000; // 100ms
  const cacheKey = `${model}:${action}:${JSON.stringify(args)}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [model],
    redis,
    cacheTime,
    excludeCacheMethods: [action],
  });

  // Run a "fake" Prisma database call
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

  // Test if the data does not exist in the cache
  equal(JSON.parse(await redis.get(cacheKey)), null);
});
