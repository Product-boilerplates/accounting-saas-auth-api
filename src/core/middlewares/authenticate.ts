import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../../api/auth/utils";
import { IRequestUser } from "../../common/interface/common.interface";
import { cacheService } from "../cache";
import { prisma } from "../database";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];

    const isRevoked = await cacheService.get(`revoked:${token}`);
    if (isRevoked)
      return res
        .status(401)
        .json({ success: false, message: "Token has been revoked" });

    let decoded: any;

    try {
      decoded = verifyAccessToken(token);
      if (!decoded)
        return res
          .status(401)
          .json({ success: false, message: "Invalid or expired token" });
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    // Get user with roles and permissions

    const cacheKey = `user-permissions:${decoded.id}`;
    let user = await cacheService.get<IRequestUser>(cacheKey);

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          status: true,
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  permissions: {
                    select: {
                      permission: {
                        select: {
                          resource: true,
                          action: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      await cacheService.set(cacheKey, user, 300); // cache for 5 min
    }

    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists" });
    if (user.status === "SUSPENDED")
      return res
        .status(403)
        .json({ success: false, message: "Your account is suspended" });

    // Flatten permissions from all roles
    const permissions = user.roles.reduce(
      (acc, r) => {
        r.role.permissions.forEach((p) => {
          const resource = p.permission.resource;
          const action = p.permission.action;
          if (!acc[resource]) acc[resource] = [];
          if (!acc[resource].includes(action)) acc[resource].push(action);
        });
        return acc;
      },
      {} as Record<string, string[]>,
    );

    // Attach user and permissions to request
    (req as any).user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      status: user.status,
      permissions,
    };

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
