# `prisma-redis-middleware`

[![License: Hippocratic 3.0](https://img.shields.io/badge/License-Hippocratic_3.0-lightgrey.svg)](https://firstdonoharm.dev)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![npm version](https://badge.fury.io/js/prisma-redis-middleware.svg)](https://badge.fury.io/js/prisma-redis-middleware)
[![codecov](https://codecov.io/gh/Asjas/prisma-redis-middleware/branch/main/graph/badge.svg?token=6F6DDOSRK8)](https://codecov.io/gh/Asjas/prisma-redis-middleware)
[![Main WorkFlow](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/main.yml/badge.svg)](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/main.yml)
[![CodeQL WorkFlow](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/codeql-analysis.yml)
[![Library code size](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/size.yml/badge.svg)](https://github.com/Asjas/prisma-redis-middleware/actions/workflows/size.yml)

This is a Prisma middleware used for caching and storing of Prisma queries in Redis (uses an in-memory LRU cache as
fallback storage).

Uses [async-cache-dedupe](https://github.com/mcollina/async-cache-dedupe).

## Features

- Cache Invalidation
- Supports custom cache keys
- Cache persistance with Redis (uses an in-memory LRU cache as fallback)
- Caching multiple Prisma models each with a specific cache time
- Excluding certain Prisma models from being cached
- Excluding certain Prisma queries from being cached across all models

## Supported Node.js versions

The latest versions of the following Node.js versions are tested and supported.

- 16
- 18

## Default Cached Methods

Here is a list of all the Prisma methods that are currently cached by default in `prisma-redis-middleware`.

- findUnique
- findUniqueOrThrow
- findFirst
- findFirstOrThrow
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

_You will also need to install and configure an external dependency for `Redis` (for example: `ioredis` or one that uses
a similar API) if you don't already have a Redis Client in your project._

```sh
npm i --save-exact ioredis @types/ioredis
```

## Code Example (ESM / Import)

```mjs
import Prisma from "prisma";
import { PrismaClient } from "@prisma/client";
import { createPrismaRedisCache } from "prisma-redis-middleware";
import Redis from "ioredis";

const redis = new Redis(); // Uses default options for Redis connection

const prisma = new PrismaClient();

const cacheMiddleware: Prisma.Middleware = createPrismaRedisCache({
  models: [
    { model: "User", excludeMethods: ["findMany"] },
    { model: "Post", cacheTime: 180, cacheKey: "article" },
  ],
  storage: { type: "redis", options: { client: redis, invalidation: { referencesTTL: 300 }, log: console } },
  cacheTime: 300,
  excludeModels: ["Product", "Cart"],
  excludeMethods: ["count", "groupBy"],
  onHit: (key) => {
    console.log("hit", key);
  },
  onMiss: (key) => {
    console.log("miss", key);
  },
  onError: (key) => {
    console.log("error", key);
  },
});

prisma.$use(cacheMiddleware);
```

## Code Example (Common JS / Require)

```js
const Prisma = require("prisma");
const { PrismaClient } = require("@prisma/client");
const { createPrismaRedisCache } = require("prisma-redis-middleware");

const prisma = new PrismaClient();

const cacheMiddleware: Prisma.Middleware = createPrismaRedisCache({
  models: [
    { model: "User", cacheTime: 60 },
    { model: "Post", cacheTime: 180 },
  ],
  storage: { type: "memory", options: { invalidation: true, log: console } },
  cacheTime: 300,
  onHit: (key) => {
    console.log("hit", key);
  },
  onMiss: (key) => {
    console.log("miss", key);
  },
  onError: (key) => {
    console.log("error", key);
  },
});

prisma.$use(cacheMiddleware);
```

## API

### `createPrismaRedisCache(opts)`

Options:

- `onDedupe`: (optional) a function that is called every time a query is deduped.
- `onError`: (optional) a function that is called every time there is a cache error.
- `onHit`: (optional) a function that is called every time there is a hit in the cache.
- `onMiss`: (optional) a function that is called every time the result is not in the cache.
- `cacheTime`: (optional) (number) the default time (in seconds) to use for models that don't have a `cacheTime` value set.
  Default is 0.
- `excludeModels`: (optional) (string) an array of models to exclude from being cached.
- `excludeMethods`: (optional) (string) an array of Prisma methods to exclude from being cached for all models.
- `models`: (optional) an array of Prisma models. Models options are:

  - `model`: (required) string.
  - `cacheKey`: (optional) string. Default is the model value.
  - `cacheTime`: (optional) number (in seconds).
  - `excludeMethods`: (optional) (string) an array of Prisma methods to exclude from being cached for this model.
  - `invalidateRelated`: (optional) (string) an array of Prisma models to invalidate when mutating this model.

    Example:

    ```js
    createPrismaRedisCache({
      models: [
        { model: "User", cacheTime: 60, invalidateRelated: ["Post"] },
        { model: "Post", cacheKey: "article", excludeMethods: ["findFirst"] },
      ],
    });
    ```

- `storage`: (optional) the storage options; default is `{ type: "memory" }`. Storage options are:

  - `type`: `memory` (default) or `redis`
  - `options`: by storage type

    - for `memory` type

      - `size`: (optional) maximum number of items to store in the cache. Default is `1024`.
      - `invalidation`: (optional) enable invalidation. Default is disabled.
      - `log`: (optional) logger instance `pino` compatible, or `console`, default is disabled.

      Example:

      ```js
      createPrismaRedisCache({
        storage: { type: "memory", options: { size: 2048 }, log: console },
      });
      ```

    - for `redis` type

      - `client`: a redis client instance, mandatory. Should be an `ioredis` client or compatible.
      - `invalidation`: (optional) enable invalidation. Default is disabled.
      - `invalidation.referencesTTL`: (optional) references TTL in seconds, it means how long the references are alive;
        it should be set at the maximum of all the caches ttl.
      - `log`: (optional) logger instance `pino` compatible, or `console`, default is disabled.

      Example

      ```js
      const redis = new Redis();

      createPrismaRedisCache({
        storage: {
          type: "redis",
          options: { client: redis, invalidation: { referencesTTL: 60 }, log: console },
        },
      });
      ```

## Debugging

You can pass functions for `onMiss`, `onHit`, `onError` and `onDedupe` to `createPrismaRedisCache` which can then be
used to debug whether a Prisma query is being cached or not.

You can also pass a custom `log` (pino or console) to the `storage` option and `async-cache-dedupe` will print debug
info as it queries, sets, expires and invalidates the cache. Note that the `log` option can print out very verbose
output.
