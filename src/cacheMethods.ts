import type { PrismaQueryAction } from "./types";

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
