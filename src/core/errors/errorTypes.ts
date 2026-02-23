import { AppError, ErrorDetails } from "./AppError";

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, {
      statusCode: 401,
      errorCode: "AUTH_ERROR",
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, {
      statusCode: 403,
      errorCode: "FORBIDDEN_ERROR",
    });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: ErrorDetails) {
    super(message, {
      statusCode: 422,
      errorCode: "VALIDATION_ERROR",
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, {
      statusCode: 404,
      errorCode: "NOT_FOUND",
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict occurred", details?: ErrorDetails) {
    super(message, {
      statusCode: 409,
      errorCode: "CONFLICT_ERROR",
      details,
    });
  }
}
