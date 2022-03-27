import type { PrismaMutationAction, PrismaQueryAction } from "./types";

export const defaultCacheMethods: PrismaQueryAction[] = [
  "findUnique",
  "findFirst",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "findRaw",
  "aggregateRaw",
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
