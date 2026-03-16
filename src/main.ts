import { bootstrapApp } from "./bootstrap/app.bootstrap";
import { startServer } from "./bootstrap/server.bootstrap";
import { registerShutdown } from "./bootstrap/shutdown.bootstrap";
import { emailEvents } from "./core/events/email.events";
import { eventBus } from "./core/events/event-bul.service";
import { prisma } from "./core/database/prisma";
import { logger } from "./core/utils/logger";

const app = bootstrapApp();

// Register domain events
emailEvents(eventBus);

// Connect to database and log status
(async () => {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");

    const server = startServer(app);
    registerShutdown(server);
  } catch (error) {
    logger.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
})();
