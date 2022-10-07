import "@prisma/client";

declare module "@prisma/client" {
  type PrismaQueryAction =
    | "findFirst"
    | "findFirstOrThrow"
    | "findUnique"
    | "findUniqueOrThrow"
    | "findMany"
    | "aggregate"
    | "count"
    | "groupBy"
    | "findRaw"
    | "runCommandRaw"
    | "queryRaw"
    | "aggregateRaw";

  type PrismaMutationAction =
    | "create"
    | "createMany"
    | "update"
    | "updateMany"
    | "upsert"
    | "delete"
    | "deleteMany"
    | "executeRaw"
    | "executeRawUnsafe";

  type PrismaAction = PrismaQueryAction | PrismaMutationAction;

  namespace Prisma {
    type ModelName = string;

    interface MiddlewareParams {
      model: string;
      action: PrismaAction;
      args: any;
      dataPath: string[];
      runInTransaction: boolean;
    }
  }

  export { Prisma };
}
