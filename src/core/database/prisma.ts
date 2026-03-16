import "dotenv/config";
import { PrismaClient } from "../../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { logger } from "../utils/logger";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool as any);

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

  if (process.env.NODE_ENV === "development") {
    client.$on("query", (e: any) => {
      // logger.info(`Query: ${e.query} | Params: ${e.params} | ${e.duration}ms`);
    });
  }

  client.$on("error", (e: any) => {
    logger.error(`❌ Prisma Error: ${e.message}`);
  });

  client.$on("warn", (e: any) => {
    logger.warn(`⚠️ Prisma Warning: ${e.message}`);
  });

  return client;
}

export const prisma = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
