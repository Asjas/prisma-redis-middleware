import type { PrismaQueryAction, PrismaMutationAction } from "./types";

export const defaultCacheMethods: PrismaQueryAction[] = [
  "findUnique",
  "findFirst",
  "findMany",
  "queryRaw",
  "aggregate",
  "count",
  "groupBy",
];

export const defaultMutationMethods: PrismaMutationAction[] = [
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
