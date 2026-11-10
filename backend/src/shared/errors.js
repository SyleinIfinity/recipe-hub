export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const unauthenticated = () =>
  new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
