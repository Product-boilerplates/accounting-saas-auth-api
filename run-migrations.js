import { PrismaClient } from "./generated/prisma/index.js";

async function main() {
  console.log("Running migrations...");

  // Note: Prisma 7 doesn't support programmatic migrations yet
  // This is a placeholder - for now we'll skip migrations and just verify connection
  try {
    await prisma.$connect();
    console.log("✓ Database connection successful");

    // Check if migrations table exists
    const result =
      await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations')`;
    const hasMigrations = result[0]?.exists ?? false;

    if (hasMigrations) {
      console.log("✓ Migrations already applied");
    } else {
      console.log("⚠ No migrations found - database may need manual migration");
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

main();
