import { logger } from "../utils";

export type ErrorDetails =
  | Record<string, unknown>
  | unknown[]
  | string
  | undefined;

export interface AppErrorOptions {
  statusCode?: number;
  errorCode?: string;
  details?: ErrorDetails;
  isOperational?: boolean;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: ErrorDetails;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 400;
    this.errorCode = options.errorCode ?? "APPLICATION_ERROR";
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.context = options.context;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      ...(this.details && { details: this.details }),
      ...(process.env.NODE_ENV !== "production" && {
        stack: this.stack,
        context: this.context,
      }),
    };
  }

  public toString(): string {
    return `[${this.timestamp.toISOString()}] ${this.name} (${this.errorCode}): ${this.message}`;
  }

  public static fromError(
    error: Error,
    overrides: AppErrorOptions = {},
  ): AppError {
    return new AppError(error.message, {
      statusCode: overrides.statusCode ?? 500,
      errorCode: overrides.errorCode ?? "INTERNAL_ERROR",
      details: overrides.details ?? error.stack,
      isOperational: overrides.isOperational ?? false,
      context: overrides.context,
    });
  }

  public static log(error: AppError): void {
    logger.error(`[AppError] ❌ ${error.toString()}`, {
      details: error.details,
      context: error.context,
    });
  }
}
