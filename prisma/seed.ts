import "dotenv/config";
import { prisma } from "../src/core/database";
import permissionSeed from "./seeds/permission.seed";
import userSeed from "./seeds/user.seed";

async function main() {
  try {
    console.log("🌱 Running seed...");

    await permissionSeed();
    await userSeed();

    console.log("✅ Seed completed successfully.");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
