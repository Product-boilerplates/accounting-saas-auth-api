import argon2 from "argon2";
import { prisma } from "../../src/core/database";

async function userSeed() {
  console.log("🌱 Seeding users...");

  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });

  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" },
  });

  const userRole = await prisma.role.findUnique({
    where: { name: "USER" },
  });

  if (!superAdminRole || !adminRole || !userRole) {
    throw new Error("Roles not found. Run permission seed first.");
  }

  // 🔐 Hash passwords
  const superAdminPassword = await argon2.hash("SuperAdmin@123");
  const adminPassword = await argon2.hash("Admin@123");
  const userPassword = await argon2.hash("User@123");

  // -------------------------
  // SUPER ADMIN
  // -------------------------
  const superAdmin = await prisma.user.upsert({
    where: { email: "super_admin@example.com" },
    update: {},
    create: {
      email: "super_admin@example.com",
      username: "super_admin",
      name: "System Super Admin",
      password_hash: superAdminPassword,
      status: "ACTIVE" as const,
      user_type: "PLATFORM_ADMIN",
    },
  });

  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: superAdmin.id,
        role_id: superAdminRole.id,
      },
    },
    update: {},
    create: {
      user_id: superAdmin.id,
      role_id: superAdminRole.id,
    },
  });

  // -------------------------
  // ADMIN
  // -------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      username: "admin",
      name: "Admin User",
      password_hash: adminPassword,
      status: "ACTIVE" as const,
      user_type: "PLATFORM_ADMIN",
    },
  });

  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: admin.id,
        role_id: adminRole.id,
      },
    },
    update: {},
    create: {
      user_id: admin.id,
      role_id: adminRole.id,
    },
  });

  // -------------------------
  // NORMAL USER
  // -------------------------
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      username: "user",
      name: "Normal User",
      password_hash: userPassword,
      status: "ACTIVE" as const,
      user_type: "TENANT_USER",
    },
  });

  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: user.id,
        role_id: userRole.id,
      },
    },
    update: {},
    create: {
      user_id: user.id,
      role_id: userRole.id,
    },
  });

  console.log("✅ Users seeded successfully.");
}

export default userSeed;
