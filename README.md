# Prisma Redis Middleware

Prisma Middleware for caching queries in Redis.

Based on the work done by @abhiaiyer91 on
[prisma-lrucache-middleware](https://github.com/abhiaiyer91/prisma-lrucache-middleware).

## Supported Node.js versions

The latest versions of the following Node.js versions are tested and supported.

- 12
- 14
- 16

## Cached queries

Here is a list of all the query methods that are currently cached by default in `prisma-redis-middleware`.

- findUnique
- findFirst
- findMany
- queryRaw
- aggregate
- count
- groupBy

## Quick Start

Install the package using `npm`:

```sh
npm i --save-exact prisma-redis-middleware
```

or `yarn`:

```sh
yarn add prisma-redis-middleware
```

You will also need to install and configure an external dependency for `Redis` (the examples show `ioredis`) if you
don't already have a Redis Client in your project.

```sh
npm i --save-exact ioredis
```

## Code

```js
import Prisma from "@prisma/client";
import { createPrismaRedisCache } from "prisma-redis-middleware";
import Redis from "ioredis";

const redis = new Redis(); // Uses default options for Redis connection

const prismaClient = new Prisma.PrismaClient();

// First example with inline `options` being passed
prismaClient.$use(
  createPrismaRedisCache({
    models: [`User`, `Post`],
    cacheTime: 300, // five minutes
    redis,
    excludeCacheMethods: ["aggregate", "findMany"],
  }),
);

// Second example with the `options` defined as a variable
const options = {
  models: [`Comment`],
  cacheTime: 60 * 1000 * 30, // thirty minutes
  redis,
  excludeCacheMethods: ["findUnique"],
};

prismaClient.$use(createPrismaRedisCache(options));
```

### Options

The `prisma-redis-middleware` function takes 4 arguments, `models`, `cacheTime` and `redis` are required arguments.
`excludeCacheMethods` is an optional argument.

```mjs
createPrismaMiddleware({ models, cacheTime, redis, excludeCacheMethods });
```

#### Cache

- `models`: An array of Prisma models (for example `User`, `Post`, `Comment`) (required)
- `cacheTime`: number (milliseconds) (required)
- `redis`: A Redis instance (required)
- `excludeCacheMethods`: An array of Prisma Methods that should be excluded from being cached. (optional)

## Debugging

Default: `false`

You may turn on logging to help debug why certain Prisma queries are not being cached as you may expect.

If you are using the `Node.js` binary directly you can do this.

```json
"scripts": {
  "debug:dev": "DEBUG=prisma-redis-middleware node index.js",
}
```

If you are using a library such as `nodemon` then you can do this.

```json
"scripts": {
  "debug:dev": "DEBUG=prisma-redis-middleware nodemon index.js",
}
```

This is what the debug output should look like when a query is found in the cache.

```sh
[prisma:redis:middleware][DEBUG] findUnique on User was found in the cache with key User:findUnique:{"where":{"id":1}}.
```

This is what the debug output should look like when a query isn't found in the cache.

```sh
[prisma:redis:middleware][DEBUG] findUnique on User with key User:findUnique:{"where":{"id":1}} was not found in the cache.
[prisma:redis:middleware][DEBUG] Manually fetching query findUnique on User from the Prisma database.
[prisma:redis:middleware][DEBUG] Caching action findUnique on User with key User:findUnique:{"where":{"id":1}}.
```

This is what the debug output should look like when an action is skipped (ie. `Upsert`, `Delete`, etc.)

```sh
[prisma:redis:middleware][DEBUG] upsert on User is skipped.
[prisma:redis:middleware][DEBUG] deleteMany on Post is skipped.
```
