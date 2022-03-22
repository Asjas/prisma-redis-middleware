# `prisma-redis-middleware`

[![License: Hippocratic 3.0](https://img.shields.io/badge/License-Hippocratic_3.0-lightgrey.svg)](https://firstdonoharm.dev)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![npm version](https://badge.fury.io/js/prisma-redis-middleware.svg)](https://badge.fury.io/js/prisma-redis-middleware)
[![codecov](https://codecov.io/gh/Asjas/prisma-redis-middleware/branch/main/graph/badge.svg?token=6F6DDOSRK8)](https://codecov.io/gh/Asjas/prisma-redis-middleware)
[![Main WorkFlow](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/main.yml/badge.svg)](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/main.yml)
[![CodeQL WorkFlow](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/codeql-analysis.yml)

This is a Prisma middleware used for caching and storing of Prisma queries in Redis (uses an in-memory LRU cache as
fallback storage).

## Features

- Cache Invalidation
- Supports custom cache keys
- Cache persistance with Redis (uses an in-memory LRU cache as fallback)
- Caching multiple Prisma models each with a specific cache time
- Excluding certain Prisma models from being cached
- Excluding certain Prisma queries from being cached across all models

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
- count
- aggregate
- groupBy
- findRaw
- aggregateRaw

`queryRaw` is not cached as it's executed against the Prisma db itself and not a model. This Prisma middleware is used
for caching queries based on the models that they are executed against.

## Quick Start

Install the package using `npm`:

```sh
npm i --save-exact prisma-redis-middleware
```

or `yarn`:

```sh
yarn add prisma-redis-middleware
```

or `pnpm`:

```sh
pnpm add prisma-redis-middleware
```

_You will also need to install and configure an external dependency for `Redis` (for example: `ioredis` or one that uses
a similar API) if you don't already have a Redis Client in your project._

```sh
npm i --save-exact ioredis
```

## Code Example (ESM / Import)

```mjs
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
    storage: { type: "redis", options: { client: redis, invalidation: { referencesTTL: 300 }, log: console } },
    defaultCacheKey: "id",
    defaultCacheTime: 300,
    excludeCacheModels: ["Product", "Cart"],
    defaultExcludeCacheMethods: ["count", "groupby"],
    onDedupe: (key) => {
      console.log("deduped", key);
    },
    onHit: (key) => {
      console.log("hit", key);
    },
    onMiss: (key) => {
      console.log("miss", key);
    },
  }),
);
```

## Code Example (Common JS / Require)

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
    storage: { type: "memory", options: { invalidation: true, log: console } },
    defaultCacheTime: 300,
    onDedupe: (key) => {
      console.log("deduped", key);
    },
    onHit: (key) => {
      console.log("hit", key);
    },
    onMiss: (key) => {
      console.log("miss", key);
    },
  }),
);
```

### Options

The `prisma-redis-middleware` function takes 6 main arguments.

```js
createPrismaMiddleware({
  models,
  storage,
  defaultCacheKey,
  defaultCacheTime,
  excludeCacheModels,
  defaultExcludeCacheMethods,
});
```

#### Cache

- `models`: An array of objects (for example `User`, `Post`, `Comment`)
- `memory`: A Redis instance (required)
- `defaultCacheTime`: number (milliseconds) (`default: 0`)
- `excludeCacheMethods`: An array of Prisma Methods that should be excluded from being cached. (optional)

## Debugging
