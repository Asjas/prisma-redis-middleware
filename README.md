# Prisma Redis Middleware

Prisma Middleware for caching of queries in Redis.

Based on the work done by @abhiaiyer91 on
[prisma-lrucache-middleware](https://github.com/abhiaiyer91/prisma-lrucache-middleware).

## Cached queries

Here is a list of all the queries that are currently cached in `prisma-redis-middleware`.

- findUnique
- findFirst
- findMany
- queryRaw
- aggregate
- count
- groupBy

### How to use

```mjs
import Prisma from "@prisma/client";
import { createPrismaRedisCache } from "prisma-redis-middleware";

const prismaClient = new Prisma.PrismaClient();

// First example
prismaClient.$use(
  createPrismaRedisCache(
    { model: `User`, cacheTime: 300 },
    {
      REDIS_HOST: "",
      REDIS_PORT: "",
      REDIS_AUTH: "",
    },
  ),
);

// Second example
const cache = {
  model: `Post`,
  cacheTime: 60 * 1000 * 30, // thirty minutes
};

const config = {
  REDIS_HOST: "",
  REDIS_PORT: "",
  REDIS_AUTH: "",
};

prismaClient.$use(createPrismaRedisCache(cache, config));
```

### Options

The `prisma-redis-middleware` function takes 2 arguments, the first is a `cache` object and the second is a `config`
object.

```mjs
createPrismaMiddleware(cache, config);
```

#### Cache

- `model`: Prisma model (for example `User`, `Post`, `Comment`)
- `cacheTime`: number (milliseconds)

#### Config (optional)

- `REDIS_HOST`: String (optional)
- `REDIS_PORT`: String (optional)
- `REDIS_AUTH`: String (optional)

### Debugging

Default: `false`

You may turn on logging to help debug why certain Prisma queries are not being cached as you may expect.

If you are using the `Node.js` binary directly you can do this.

```json
"scripts": {
  "debug:dev": "DEBUG=prisma-redis-middleware node index.mjs",
}
```

If you are using a library such as `nodemon` then you can do this.

```json
"scripts": {
  "debug:dev": "DEBUG=prisma-redis-middleware nodemon index.mjs",
}
```

This is what the debug output should look like when a query is found in the cache.

```sh
[prisma:redis:middleware][DEBUG] findUnique on User was found in the cache with key User_findUnique_{"where":{"id":1}}.
```

This is what the debug output should look like when a query isn't found in the cache.

```sh
[prisma:redis:middleware][DEBUG] findUnique on User with key User_findUnique_{"where":{"id":1}} was not found in the cache.
[prisma:redis:middleware][DEBUG] Manually fetching query findUnique on User from the Prisma database.
[prisma:redis:middleware][DEBUG] Caching action findUnique on User with key User_findUnique_{"where":{"id":1}}.
```

This is what the debug output should look like when an action is skipped (ie. `Upsert`, `Delete`, etc.)

```sh
[prisma:redis:middleware][DEBUG] upsert on User is skipped.
[prisma:redis:middleware][DEBUG] deleteMany on Post is skipped.
```
