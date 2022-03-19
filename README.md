# `prisma-redis-middleware`

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![npm version](https://badge.fury.io/js/prisma-redis-middleware.svg)](https://badge.fury.io/js/prisma-redis-middleware)
[![codecov](https://codecov.io/gh/Asjas/prisma-redis-middleware/branch/main/graph/badge.svg?token=6F6DDOSRK8)](https://codecov.io/gh/Asjas/prisma-redis-middleware)
[![Main WorkFlow](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/main.yml/badge.svg)](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/main.yml)
[![CodeQL WorkFlow](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/codeql-analysis.yml)

This is a Prisma middleware used for caching and storing of Prisma queries in Redis (uses an in-memory LRU cache as
fallback storage).

Based on the work done by @abhiaiyer91 on
[prisma-lrucache-middleware](https://github.com/abhiaiyer91/prisma-lrucache-middleware).

## Features

- Cache Invalidation
- Supports custom cache keys
- Cache persistance with Redis (uses an in-memory LRU cache as fallback)
- Caching multiple Prisma models each with a specific cache time
- Excluding certain Prisma models from being cached
- Excluding certain Prisma queries from being cached

## Supported Node.js versions

The latest versions of the following Node.js versions are tested and supported.

- 12
- 14
- 16

## Default Cached queries

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

You will also need to install and configure an external dependency for `Redis` (for example: `ioredis` or similar) if
you don't already have a Redis Client in your project.

```sh
npm i --save-exact ioredis
```

## Code Example ESM

```js
import Prisma from "@prisma/client";
import { createPrismaRedisCache } from "prisma-redis-middleware";
import Redis from "ioredis";

const redis = new Redis(); // Uses default options for Redis connection

const prismaClient = new Prisma.PrismaClient();

prismaClient.$use(
  createPrismaRedisCache({
    models: [
      { model: "User", cacheTime: 60, cacheKey: "userId", excludeCacheMethods: "findMany" },
      { model: "Post", cacheTime: 180, cacheKey: "postId" },
    ],
    storage: { type: "redis", options: { client: redis, invalidation: true } },
    defaultCacheKey: "id", // default is "id" field
    defaultCacheTime: 300, // five minutes
    defaultExcludeCacheModels: [],
    defaultExcludeCacheMethods: ["queryRaw"],
  }),
);
```

## Code Example CommonJS

```js
const { PrismaClient } = require("@prisma/client");
const { createPrismaRedisCache } = require("prisma-redis-middleware");
const Redis = require("ioredis");

const redis = new Redis(); // Uses default options for Redis connection

const prismaClient = new PrismaClient();

prismaClient.$use(
  createPrismaRedisCache({
    models: [
      { model: "User", cacheTime: 60, cacheKey: "userId" },
      { model: "Post", cacheTime: 180, cacheKey: "postId" },
    ],
    storage: { type: "memory", options: { invalidation: true } },
    defaultCacheTime: 300, // five minutes
  }),
);
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

### [DEBUG] Query found in cache

This is what the debug output should look like when a query is found in the cache.

```sh
[prisma:redis:middleware][DEBUG] findUnique on User was found in the cache with key User:findUnique:{"where":{"id":1}}.
```

### [DEBUG] Query not found in cache

This is what the debug output should look like when a query isn't found in the cache.

```sh
[prisma:redis:middleware][DEBUG] findUnique on User with key User:findUnique:{"where":{"id":1}} was not found in the cache.
[prisma:redis:middleware][DEBUG] Manually fetching query findUnique on User from the Prisma database.
[prisma:redis:middleware][DEBUG] Caching action findUnique on User with key User:findUnique:{"where":{"id":1}}.
```

### [DEBUG] Query skipped

This is what the debug output should look like when an action is skipped (ie. `Upsert`, `Delete`, etc.)

```sh
[prisma:redis:middleware][DEBUG] upsert on User is skipped.
[prisma:redis:middleware][DEBUG] deleteMany on Post is skipped.
```

### [DEBUG] Invalidated cache

This is what the debug output should look like when an action caused the cache to be invalidated.

```sh
[prisma:redis:middleware][DEBUG] create on User caused 1 keys to be deleted from cache.
[prisma:redis:middleware][DEBUG] deleteMany on Post caused 7 keys to be deleted from cache.
```
