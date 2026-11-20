export class HttpError extends Error {
  public statusCode: number;
  public errors?: Record<string, string[]> | null;

  constructor(statusCode: number, message: string, errors: Record<string, string[]> | null = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  get status(): number {
    return this.statusCode;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', errors: Record<string, string[]> | null = null) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', errors: Record<string, string[]> | null = null) {
    super(401, message, errors);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', errors: Record<string, string[]> | null = null) {
    super(403, message, errors);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource Not Found', errors: Record<string, string[]> | null = null) {
    super(404, message, errors);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', errors: Record<string, string[]> | null = null) {
    super(409, message, errors);
  }
}
