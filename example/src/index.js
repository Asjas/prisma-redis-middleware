import PrismaClient from "@prisma/client";
import { createPrismaRedisCache } from "../../dist/index.js";
import Redis from "ioredis";

console.log(createPrismaRedisCache);

const redis = new Redis(); // Uses default options for Redis connection
const prisma = new PrismaClient.PrismaClient();

const cache = createPrismaRedisCache({
  storage: { type: "redis", options: { client: redis, invalidation: { referencesTTL: 60 }, log: console } },
  defaultCacheTime: 60,
  onDedupe: (key) => {
    console.log("deduped", key);
  },
  onHit: (key) => {
    console.log("hit", key);
  },
  onMiss: (key) => {
    console.log("miss", key);
  },
});

prisma.$use(cache);

// prisma.$use(async (params, next) => {
//   console.log("model", params.model);
//   console.log("args", params.args);

//   const result = await next(params);

//   return result;
// });

async function main() {
  await prisma.user.create({ data: { email: "john@email.com" } });
  await prisma.user.create({ data: { email: "mary@email.com" } });

  const users = await prisma.user.findMany({
    where: {
      email: {
        endsWith: "email.com",
      },
    },
  });

  console.log("users", users);

  // await prisma.user.update({ where: { email: "john@email.com" }, data: { email: "mary@email.com" } });

  const count = await prisma.user.count();

  console.log("count", count);

  // const res2 = await prisma.user.aggregate({
  //   _count: {
  //     _all: true,
  //   },
  // });

  // console.log("res2: ", res2);

  // const res2 = await prisma.user.findMany({
  //   where: {
  //     email: {
  //       endsWith: "email.com",
  //     },
  //   },
  // });

  // console.log("res2", res2);

  // const createMany = await prisma.user.createMany({
  //   data: [
  //     { name: "Bob", email: "bob@prisma.io" },
  //     { name: "Bobo", email: "bob@prisma.io" }, // Duplicate unique key!
  //     { name: "Yewande", email: "yewande@prisma.io" },
  //     { name: "Angelique", email: "angelique@prisma.io" },
  //   ],
  //   skipDuplicates: true, // Skip 'Bobo'
  // });

  // console.log("createMany", createMany);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
