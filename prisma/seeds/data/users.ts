import { hashSync } from "bcrypt";

export const users = [
  {
    name: "Super Admin",
    email: "super_admin@example.com",
    username: "super_admin",
    password_hash: hashSync("admin123", 12),
    status: "ACTIVE" as const,
    roles: ["super_admin"],
  },
  {
    name: "Regular User",
    email: "user@example.com",
    username: "regularuser",
    password_hash: hashSync("user123", 12),
    status: "ACTIVE" as const,
    roles: ["user"],
  },
  {
    name: "Content Moderator",
    email: "moderator@example.com",
    username: "moderator",
    password_hash: hashSync("mod123", 12),
    status: "ACTIVE" as const,
    roles: ["moderator"],
  },
];
