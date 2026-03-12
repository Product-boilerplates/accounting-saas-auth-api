import { NextFunction, Request, Response } from "express";
import { Action, Resource } from "../../shared/permissions";

export const authorize =
  (resource: Resource, action: Action) =>
  (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !user.permissions) {
      return res
        .status(403)
        .json({ message: "Forbidden: No permissions found" });
    }

    const actions = user.permissions[resource] || [];

    if (!actions.includes(action)) {
      return res
        .status(403)
        .json({ message: `Forbidden: You cannot ${action} on ${resource}` });
    }

    next();
  };
