export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export class StorageFailure extends Error {
  constructor(cause) {
    super("Task storage operation failed", { cause });
    this.name = "StorageFailure";
  }
}

export function invalidRequest(message = "The request is invalid.") {
  return new ApiError(400, "INVALID_REQUEST", message);
}

export function requestTooLarge() {
  return new ApiError(413, "REQUEST_TOO_LARGE", "The request body exceeds 65,536 bytes.");
}

export function notFound() {
  return new ApiError(404, "NOT_FOUND", "The requested task was not found.");
}

export function invalidTransition() {
  return new ApiError(409, "INVALID_TRANSITION", "The requested status transition is not allowed.");
}

export function storageError() {
  return new ApiError(500, "STORAGE_ERROR", "Task data could not be read or saved.");
}

export function internalError() {
  return new ApiError(500, "INTERNAL_ERROR", "The request could not be completed.");
}

export function toApiError(error) {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof StorageFailure) {
    return storageError();
  }
  return internalError();
}
