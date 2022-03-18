import Redis from "ioredis";

export type PrismaMutationAction =
  | "create"
  | "createMany"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "executeRawUnsafe";

export type PrismaQueryAction =
  | "findFirst"
  | "findUnique"
  | "findMany"
  | "aggregate"
  | "count"
  | "groupBy"
  | "queryRaw";

export type PrismaAction = PrismaMutationAction | PrismaQueryAction;

/**
 * These options are being passed in to the middleware as "params"
 * https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#params
 */
export type MiddlewareParams = {
  model: string;
  action: PrismaAction;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

// https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#use
export type Middleware<T = any> = (params: any, next: (params: any) => Promise<T>) => Promise<T>;

export type RedisMemoryOptions = {
  client: Redis.Redis;
  invalidation?: boolean | { referencesTTL?: number };
  log?: any;
};

export type MemoryStorageOptions = {
  size?: number;
  invalidation?: boolean;
  log?: any;
};

export type CreatePrismaRedisCache = {
  models?: [
    {
      model: string;
      primaryKey?: string;
      cacheTime?: number;
      excludeCacheMethods?: [PrismaQueryAction];
    },
  ];
  defaultCacheTime?: number;
  storage?:
    | {
        type: "redis";
        options?: RedisMemoryOptions;
      }
    | {
        type: "memory";
        options?: MemoryStorageOptions;
      };

  defaultExcludeCacheMethods?: [PrismaQueryAction];
  onError?: () => void;
  onHit?: () => void;
  onMiss?: () => void;
  onDedupe?: () => void;
};
