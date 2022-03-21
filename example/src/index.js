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

async function main() {
  await prisma.user.create({ data: { email: "john@email.com" } });

  const res1 = await prisma.user.findMany({
    where: {
      email: {
        endsWith: "email.com",
      },
    },
  });

  console.log("res1", res1);

  await prisma.user.update({ where: { email: "john@email.com" }, data: { email: "mary@email.com" } });

  const res2 = await prisma.user.findMany({
    where: {
      email: {
        endsWith: "email.com",
      },
    },
  });

  console.log("res2", res2);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
