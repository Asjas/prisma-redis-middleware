declare module "@prisma/client" {
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
