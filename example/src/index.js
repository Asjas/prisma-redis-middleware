"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var PrismaClient = require("@prisma/client").PrismaClient;
var createPrismaRedisCache = require("prisma-redis-middleware").createPrismaRedisCache;
var Redis = require("ioredis");
var redis = new Redis(); // Uses default options for Redis connection
var prisma = new PrismaClient();
var cacheMiddleware = createPrismaRedisCache({
    models: [
        { model: "User", cacheTime: 300 },
        { model: "Post", cacheKey: "Article" },
    ],
    storage: { type: "redis", options: { client: redis, invalidation: { referencesTTL: 60 } } },
    defaultCacheTime: 60,
    onHit: function (key) {
        console.log("Hit: ✅", key);
    },
    onMiss: function (key) {
        console.log("Miss: ❌", key);
    }
});
prisma.$use(cacheMiddleware);
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Create 2 users in database
                return [4 /*yield*/, prisma.user.create({ data: { name: "John", email: "john@email.com" } })];
                case 1:
                    // Create 2 users in database
                    _a.sent();
                    return [4 /*yield*/, prisma.user.create({ data: { name: "Mary", email: "mary@email.com" } })];
                case 2:
                    _a.sent();
                    // Find users to test cache
                    return [4 /*yield*/, prisma.user.findMany({
                            where: {
                                email: {
                                    endsWith: "email.com"
                                }
                            }
                        })];
                case 3:
                    // Find users to test cache
                    _a.sent();
                    return [4 /*yield*/, prisma.user.findMany({
                            where: {
                                email: {
                                    endsWith: "email.com"
                                }
                            }
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.count()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.count()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.count()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.update({ where: { email: "john@email.com" }, data: { name: "Alice", email: "alice@email.com" } })];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.findMany({
                            where: {
                                email: {
                                    endsWith: "email.com"
                                }
                            }
                        })];
                case 9:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main()["finally"](function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })["catch"](function (err) {
    console.error(err);
});
//# sourceMappingURL=index.js.map