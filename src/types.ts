import type Redis from "ioredis";

export type PrismaQueryAction =
  | "findFirst"
  | "findUnique"
  | "findMany"
  | "aggregate"
  | "count"
  | "groupBy"
  | "findRaw"
  | "aggregateRaw";

export type PrismaMutationAction =
  | "create"
  | "createMany"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "executeRawUnsafe";

export type PrismaAction = PrismaQueryAction | PrismaMutationAction;

export type Result = Record<string, unknown> | Record<string, unknown>[];

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
export type Middleware<T = any> = (
  params: MiddlewareParams,
  next: (params: MiddlewareParams) => Promise<T>,
) => Promise<T>;

export type FetchFromPrisma = (params: MiddlewareParams) => Promise<Result>;

export type RedisMemoryOptions = {
  client: Redis;
  invalidation?: boolean | { referencesTTL?: number };
  log?: any;
};

export type MemoryStorageOptions = {
  size?: number;
  invalidation?: boolean;
  log?: any;
};

export type CreatePrismaRedisCache = {
  models?: {
    model?: string;
    cacheKey?: string;
    cacheTime?: number;
    excludeMethods?: PrismaQueryAction[];
  }[];
  storage?:
    | {
        type: "redis";
        options?: RedisMemoryOptions;
      }
    | {
        type: "memory";
        options?: MemoryStorageOptions;
      };
  cacheTime?: number;
  excludeModels?: string[];
  excludeMethods?: PrismaQueryAction[];
  onError?: (key: string) => void;
  onHit?: (key: string) => void;
  onMiss?: (key: string) => void;
  onDedupe?: (key: string) => void;
};
