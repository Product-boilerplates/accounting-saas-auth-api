import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../errors";
import { AppError } from "../errors/AppError";
import { ResponseHandler } from "../utils/responseHandler";

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;

export class BaseController {
  asyncHandler(fn: AsyncRequestHandler): AsyncRequestHandler {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error: unknown) {
        console.error("[Controller Error]", {
          path: req.path,
          method: req.method,
          error,
        });

        // ---------- Known AppError ----------
        if (error instanceof AppError) {
          return next(error);
        }

        // ---------- Zod ----------
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as any).name === "ZodError"
        ) {
          return next(
            new ValidationError("Validation failed", (error as any).errors),
          );
        }

        // ---------- Prisma ----------
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as any).code === "P2002"
        ) {
          return next(
            new AppError("Duplicate entry", {
              statusCode: 409,
              details: { fields: (error as any).meta?.target },
            }),
          );
        }

        // ---------- Fallback ----------
        const message =
          error instanceof Error ? error.message : "Something went wrong";

        return next(
          new AppError(message, {
            statusCode: 500,
            errorCode: "INTERNAL_SERVER_ERROR",
          }),
        );
      }
    };
  }

  sendResponse = ResponseHandler.success;
  sendError = ResponseHandler.error;
  serverError = ResponseHandler.serverError;
}
