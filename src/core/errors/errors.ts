import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ZodError, ZodIssue } from "zod";
import { AppError, ErrorDetails } from "./AppError";

export class ValidationError extends AppError {
  public readonly issues: ZodIssue[];
  public readonly flattenedErrors: {
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
  };

  constructor(issues: ZodIssue[] | ZodError) {
    const parsedIssues = issues instanceof ZodError ? issues.issues : issues;

    const flattened = issues instanceof ZodError ? issues.flatten() : null;

    super("Validation failed", {
      statusCode: 400,
      errorCode: "VALIDATION_ERROR",
      details: ValidationError.transformIssuesToDetails(parsedIssues),
      isOperational: true,
    });

    this.issues = parsedIssues;

    this.flattenedErrors = flattened || {
      fieldErrors: ValidationError.getFieldErrors(parsedIssues),
      formErrors: ValidationError.getFormErrors(parsedIssues),
    };

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  private static transformIssuesToDetails(issues: ZodIssue[]): ErrorDetails[] {
    return issues.map((issue) => ({
      field: issue.path.join(".") || "general",
      message: issue.message,
      code: issue.code,
      ...(issue.path.length > 0 && { path: issue.path }),
    }));
  }

  private static getFieldErrors(issues: ZodIssue[]): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of issues) {
      const field = issue.path.join(".");
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }

    return fieldErrors;
  }

  private static getFormErrors(issues: ZodIssue[]): string[] {
    return issues
      .filter((issue) => issue.path.length === 0)
      .map((issue) => issue.message);
  }

  public toJSON() {
    return {
      ...super.toJSON(),
      issues: this.issues,
      flattened: this.flattenedErrors,
    };
  }

  public getFieldErrors(): Record<string, string[]> {
    return this.flattenedErrors.fieldErrors;
  }

  public getFormErrors(): string[] {
    return this.flattenedErrors.formErrors;
  }

  public hasErrors(): boolean {
    return (
      this.issues.length > 0 ||
      Object.keys(this.flattenedErrors.fieldErrors).length > 0 ||
      this.flattenedErrors.formErrors.length > 0
    );
  }
}

export class DatabaseError extends AppError {
  public readonly prismaCode: string;
  public readonly meta?: Record<string, unknown>;
  public readonly target?: string[];
  private static readonly prismaErrorMessages: Record<string, string> = {
    P2000: "The provided value is too long for the column",
    P2001: "Record not found in the database",
    P2002: "Unique constraint violation",
    P2003: "Foreign key constraint violation",
    P2004: "Database constraint violation",
    P2005: "Invalid value for field",
    P2006: "Invalid value provided",
    P2007: "Data validation error",
    P2008: "Query parsing failed",
    P2009: "Query validation failed",
    P2010: "Raw query failed",
    P2011: "Null constraint violation",
    P2012: "Missing required value",
    P2013: "Missing required argument",
    P2014: "Relation violation",
    P2015: "Related record not found",
    P2016: "Query interpretation error",
    P2017: "Records not connected",
    P2018: "Required connected records not found",
    P2019: "Input error",
    P2020: "Value out of range",
    P2021: "Table does not exist",
    P2022: "Column does not exist",
    P2023: "Inconsistent column data",
    P2024: "Connection pool timeout",
    P2025: "Record to update/delete not found",
    P2026: "Unsupported feature",
    P2027: "Multiple errors occurred",
    P2028: "Transaction API error",
    P2030: "Cannot find full text index",
    P2033: "Numeric value out of range",
    P2034: "Transaction failed",
  };

  constructor(error: PrismaClientKnownRequestError) {
    const message = DatabaseError.getErrorMessage(error);
    const details = DatabaseError.getErrorDetails(error);
    const statusCode = DatabaseError.getStatusCode(error);

    super(message, {
      statusCode,
      errorCode: error.code || "DATABASE_ERROR",
      details,
      isOperational: true,
      context: {
        prismaCode: error.code,
        meta: error.meta,
      },
    });

    this.prismaCode = error.code;
    this.meta = error.meta;
    this.target = error.meta?.target as string[] | undefined;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  private static getErrorMessage(error: PrismaClientKnownRequestError): string {
    return (
      this.prismaErrorMessages[error.code] ||
      error.message ||
      "Database operation failed"
    );
  }

  private static getStatusCode(error: PrismaClientKnownRequestError): number {
    // Map specific Prisma error codes to appropriate HTTP status codes
    const code = error.code;
    if (code === "P2002" || code === "P2003" || code === "P2011") {
      return 409; // Conflict
    }
    if (code === "P2001" || code === "P2015" || code === "P2025") {
      return 404; // Not Found
    }
    if (code === "P2000" || code === "P2005" || code === "P2020") {
      return 400; // Bad Request
    }
    if (code === "P2024") {
      return 503; // Service Unavailable
    }
    return 500; // Default to Internal Server Error
  }

  private static getErrorDetails(
    error: PrismaClientKnownRequestError,
  ): ErrorDetails[] {
    const details: ErrorDetails[] = [
      {
        field: "database",
        message: error.message,
        code: error.code,
      },
    ];

    if (error.meta?.target) {
      details.push({
        field: "target",
        message: `Affected fields: ${(error.meta.target as string[]).join(
          ", ",
        )}`,
        code: "TARGET_FIELDS",
      });
    }

    if (error.meta?.cause) {
      details.push({
        field: "cause",
        message: error.meta.cause as string,
        code: "DATABASE_CAUSE",
      });
    }

    return details;
  }
}

export class RateLimitError extends AppError {
  public readonly resetTime: Date;

  constructor(resetTime: Date) {
    super("Too many requests", {
      statusCode: 429,
      isOperational: true,
      details: { resetTime },
      errorCode: "RATE_LIMIT_EXCEEDED",
    });
    this.resetTime = resetTime;
  }
}

export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier: string | number,
    details?: ErrorDetails,
  ) {
    super(`${resource} with ID ${identifier} not found`, {
      statusCode: 404,
      errorCode: "NOT_FOUND",
      details,
    });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, {
      statusCode: 401,
      isOperational: true,
      errorCode: "AUTHENTICATION_ERROR",
    });
  }
}

export const throwNotFound = (entity: string, id: string | number) => {
  throw new AppError(`${entity} with ID ${id} does not exist`, {
    statusCode: 404,
  });
};

export const throwValidation = (message: string) => {
  throw new AppError(message, {
    statusCode: 404,
    errorCode: "VALIDATION_ERROR",
  });
};

export const throwUnauthorized = (message = "Unauthorized") => {
  throw new AppError(message, {
    statusCode: 401,
    errorCode: "AUTH_ERROR",
  });
};

export const throwUnHandle = (message = "Server error") => {
  throw new AppError(message, {
    statusCode: 500,
    errorCode: "INTERNAL_SERVER_ERROR",
  });
};

export enum RedisErrorCodes {
  CONNECTION_REFUSED = "ECONNREFUSED",
  MAX_RETRIES = "MAX_RETRIES_PER_REQUEST_FAILED",
  NO_AUTH = "NO_AUTH",
  BUSY = "BUSY",
}
