import PrismaClient from "@prisma/client";
import { createPrismaRedisCache, Middleware } from "prisma-redis-middleware";
import Redis from "ioredis";

const redis = new Redis(); // Uses default options for Redis connection
const prisma = new PrismaClient.PrismaClient();

const cache: Middleware = createPrismaRedisCache({
  models: ["User", "Post", "Profile"],
  cacheTime: 300, // five minutes
  redis,
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

  console.log(res1);

  await prisma.user.update({ where: { email: "john@email.com" }, data: { email: "mary@email.com" } });

  const res2 = await prisma.user.findMany({
    where: {
      email: {
        endsWith: "email.com",
      },
    },
  });

  console.log(res2);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
