import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../../../config";

export function generateAccessToken(payload: object) {
  return jwt.sign(payload, env.JWT_SECRET!, { expiresIn: "15m" });
}

export function generateRefreshToken(payload: object) {
  return jwt.sign(payload, env.REFRESH_SECRET!, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET!);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.REFRESH_SECRET!);
}

/*-----------------------------
  Service Token (Optional)
  For service-to-service auth
-----------------------------*/
export function generateServiceToken(payload: JwtPayload) {
  return jwt.sign(payload, env.SERVICE_SECRET!, { expiresIn: "1h" });
}

export function verifyServiceToken(token: string) {
  try {
    return jwt.verify(token, env.SERVICE_SECRET!);
  } catch (err) {
    throw new Error("Invalid or expired service token");
  }
}
