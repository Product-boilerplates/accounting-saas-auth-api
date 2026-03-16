import { NextFunction, Request, Response } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { Prisma } from "../../../generated/prisma";
import { logger } from "../utils/logger";
import { AppError } from "./AppError";

export interface ErrorResponse {
  success: boolean;
  message: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  let customError: AppError;

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch ((err as any).code) {
      case "P2002":
        customError = new AppError(
          `Duplicate field: ${(err as any).meta?.target}`,
          {
            statusCode: 409,
            errorCode: "DUPLICATE_ENTRY",
          },
        );
        break;
      case "P2003":
        customError = new AppError(
          `Foreign key constraint failed on field: ${(err as any).meta?.field_name}`,
          {
            statusCode: 400,
            errorCode: "FOREIGN_KEY_ERROR",
          },
        );
        break;
      case "P2025":
        customError = new AppError("Record not found", {
          statusCode: 404,
          errorCode: "NOT_FOUND",
        });
        break;
      default:
        customError = new AppError(`Database error: ${err.message}`, {
          statusCode: 500,
          errorCode: "PRISMA_ERROR",
        });
    }
  }

  // JWT errors
  else if (err instanceof TokenExpiredError) {
    customError = new AppError("Token expired. Please login again.", {
      statusCode: 401,
      errorCode: "AUTH_ERROR",
    });
  } else if (err instanceof JsonWebTokenError) {
    customError = new AppError("Invalid token.", {
      statusCode: 401,
      errorCode: "AUTH_ERROR",
    });
  }

  // Custom AppError
  else if (err instanceof AppError) {
    customError = err;
  }

  // Zod validation or similar
  else if (err.name === "ZodError") {
    customError = new AppError("Validation failed", {
      statusCode: 422,
      errorCode: "VALIDATION_ERROR",
    });
  }

  // Unexpected / programming errors
  else {
    logger.error(`[UNEXPECTED] ${err.stack || err}`);
    customError = new AppError("Internal server error", {
      statusCode: 500,
      errorCode: "INTERNAL_ERROR",
    });
  }

  // Logging (only non-validation / internal)
  if (customError.statusCode >= 500 || !customError.isOperational) {
    logger.error(`[${customError.statusCode}] ${customError.message}`);
  }

  const response: ErrorResponse = {
    success: false,
    message: err.message || "Internal server error",
    code: err.errorCode || "INTERNAL_ERROR",
    details: err.details || null,
    timestamp: new Date().toISOString(),
  };

  if (
    process.env.NODE_ENV !== "production" &&
    customError.isOperational === false
  ) {
    const stack = err.stack.split(`src`);

    response.details = "src" + stack[stack.length - 1];
  }

  res.status(customError.statusCode).json(response);
}
