import { permissionsData } from "../../src/shared/permissions";
import { prisma } from "../../src/core/database";

async function permissionSeed() {
  console.log("🌱 Seeding RBAC data...");

  // -------------------------
  // Permissions
  // -------------------------

  const permissions = await Promise.all(
    permissionsData.map((perm: any) =>
      prisma.permission.upsert({
        where: {
          resource_action: {
            resource: perm.resource,
            action: perm.action,
          },
        },
        update: {},
        create: perm,
      }),
    ),
  );

  // -------------------------
  // Roles
  // -------------------------
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: {
      name: "SUPER_ADMIN",
      description: "System Super Admin",
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Admin user",
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: {
      name: "USER",
      description: "Normal user",
    },
  });

  // -------------------------
  // Assign Permissions
  // -------------------------

  // SUPER_ADMIN → All permissions
  await Promise.all(
    permissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: superAdminRole.id,
            permission_id: perm.id,
          },
        },
        update: {},
        create: {
          role_id: superAdminRole.id,
          permission_id: perm.id,
        },
      }),
    ),
  );

  // ADMIN → limited permissions
  const adminPermissions = permissions.filter(
    (p) =>
      (p.resource === "user" &&
        ["CREATE", "READ", "UPDATE"].includes(p.action)) ||
      (p.resource === "role" && p.action === "READ") ||
      (p.resource === "permission" && p.action === "READ"),
  );

  await Promise.all(
    adminPermissions.map((perm) =>
      prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: adminRole.id,
            permission_id: perm.id,
          },
        },
        update: {},
        create: {
          role_id: adminRole.id,
          permission_id: perm.id,
        },
      }),
    ),
  );

  console.log("✅ RBAC Seed completed.");
}

export default permissionSeed;
