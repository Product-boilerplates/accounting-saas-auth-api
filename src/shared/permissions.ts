export const permissionsData = [
  { resource: "user", action: "CREATE" } as const,
  { resource: "user", action: "READ" } as const,
  { resource: "user", action: "UPDATE" } as const,
  { resource: "user", action: "DELETE" } as const,
  { resource: "role", action: "CREATE" } as const,
  { resource: "role", action: "READ" } as const,
  { resource: "role", action: "UPDATE" } as const,
  { resource: "role", action: "DELETE" } as const,
  { resource: "permission", action: "READ" } as const,
  { resource: "system", action: "CREATE" } as const,
  { resource: "system", action: "READ" } as const,
  { resource: "content", action: "CREATE" } as const,
  { resource: "content", action: "READ" } as const,
  { resource: "content", action: "UPDATE" } as const,
  { resource: "content", action: "DELETE" } as const,
] as const;

// Type-safe derived types
export type Permission = (typeof permissionsData)[number];
export type Resource = Permission["resource"];
export type Action = Permission["action"];
