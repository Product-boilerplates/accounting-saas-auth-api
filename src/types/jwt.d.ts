export interface JWTPayload {
  userId: string;
  email?: string;
  role?: "user" | "admin" | "super_admin";
  iat?: number;
  exp?: number;
}
