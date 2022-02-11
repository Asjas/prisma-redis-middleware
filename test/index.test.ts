import ioredismock from "ioredis-mock";
import tap from "tap";
import { createPrismaRedisCache } from "../";

// Create the mock Redis instance we need
const redis = new ioredismock();

tap.afterEach(async () => {
  await redis.flushall();
});

tap.test("should get and set a single Prisma model in Redis cache", async ({ equal }) => {
  // Do some setup stuff
  const dbValue = "result";
  const model = "User";
  const action = "findUnique";
  const args = { where: { foo: "bar" } };
  const cacheTime = 2000; // 2 seconds
  const cacheKey = `${model}:${action}:${JSON.stringify(args)}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [model],
    redis,
    cacheTime,
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
  equal(JSON.parse(await redis.get(cacheKey)), dbValue);
});

tap.test("should get and set multiple Prisma models in Redis cache", async ({ equal }) => {
  // Do some setup stuff
  const dbValue = "result";
  const model1 = "User";
  const model2 = "Post";
  const action = "findUnique";
  const args = { where: { foo: "bar" } };
  const cacheTime = 2000; // 2 seconds
  const cacheKey1 = `${model1}:${action}:${JSON.stringify(args)}`;
  const cacheKey2 = `${model2}:${action}:${JSON.stringify(args)}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [model1, model2],
    redis,
    cacheTime,
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
  equal(JSON.parse(await redis.get(cacheKey1)), dbValue);
  equal(JSON.parse(await redis.get(cacheKey2)), dbValue);
});

tap.test("should exclude Prisma Action from being cached in Redis cache", async ({ equal }) => {
  // Do some setup stuff
  const dbValue = "result";
  const model = "User";
  const action = "findFirst";
  const args = { where: { foo: "bar" } };
  const cacheTime = 2000; // 2 seconds
  const cacheKey = `${model}:${action}:${JSON.stringify(args)}`;
  const next = () => Promise.resolve(dbValue);

  const middleware = createPrismaRedisCache({
    models: [model],
    redis,
    cacheTime,
    excludeCacheMethods: [action],
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
  equal(JSON.parse(await redis.get(cacheKey)), null);
});
