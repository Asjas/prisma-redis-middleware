const defaultCacheMethods: PrismaQueryAction[] = [
  "findUnique",
  "findFirst",
  "findMany",
  "queryRaw",
  "aggregate",
  "count",
  "groupBy",
];

const defaultMutationMethods: PrismaMutationAction[] = [
  "create",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "executeRawUnsafe",
];




export default function createPrismaRedisCache({
  models,
  cacheTime,
  redis,
  excludeCacheMethods = [],
}: {
  models: any;
  cacheTime: number;
  redis: Redis.Redis;
  excludeCacheMethods?: PrismaQueryAction[];
}) {
  return async function prismaCacheMiddleware(params: MiddlewareParams, next: (params: any) => Promise<any>) {
    // Filter out any default cache methods specified in the params
    // so that we can have a flexible cache
    const excludedCacheMethods = defaultCacheMethods.filter((cacheMethod) => excludeCacheMethods.includes(cacheMethod));

    let result: Record<string, unknown> | null;







    }

    return result;
  };
