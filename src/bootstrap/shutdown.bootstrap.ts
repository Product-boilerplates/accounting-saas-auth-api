import { Server } from "http";
import { logger } from "../core/utils/logger";
import { prisma } from "../core/database";

export const registerShutdown = (server: Server) => {
  const shutdown = async (signal: string) => {
    try {
      logger.info(`🧹 ${signal} received. Shutting down...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info("💾 Prisma disconnected.");
        process.exit(0);
      });
    } catch (err) {
      logger.error("❌ Shutdown error", err);
      process.exit(1);
    }
  };

  ["SIGINT", "SIGTERM"].forEach((sig) => {
    process.on(sig, () => shutdown(sig));
  });

  process.on("uncaughtException", (err) => {
    logger.error("❌ Uncaught Exception", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("❌ Unhandled Rejection", reason);
  });
};
