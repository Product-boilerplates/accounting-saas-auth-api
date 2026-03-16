import { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { AuthRoutes } from "../api/auth/auth.routes";
import { UserRoutes } from "../api/user/user.routes";
import { swaggerSpec } from "../docs/swagger";

export const registerRoutes = (app: Application) => {
  // Root route
  app.get("/", (_req: Request, res: Response) => {
    res.json({ message: "Auth RBAC Server is running" });
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/api/v1/auth", new AuthRoutes().router);
  app.use("/api/v1/user", new UserRoutes().router);
};
