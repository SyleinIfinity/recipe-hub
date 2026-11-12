export class StorageError extends Error {
  constructor(code, outcome = 'not_started', reference) {
    super(code);
    this.name = 'StorageError';
    this.code = code;
    this.outcome = outcome;
    if (reference) this.reference = { ...reference };
  }
}
export function providerError(error, reference) {
  if (error instanceof StorageError) {
    if (!error.reference && reference) error.reference = { ...reference };
    return error;
  }
  const diagnostic =
    error?.error && typeof error.error === 'object' ? error.error : error;
  const status = Number(diagnostic?.http_code);
  let code = 'STORAGE_UNKNOWN_OUTCOME',
    outcome = 'unknown';
  if (status >= 400 && status < 500 && ![408, 420, 429, 499].includes(status)) {
    outcome = 'rejected';
    code =
      {
        400: 'STORAGE_INVALID_INPUT',
        401: 'STORAGE_AUTHENTICATION',
        403: 'STORAGE_PERMISSION',
        409: 'STORAGE_DUPLICATE',
        413: 'STORAGE_QUOTA_EXCEEDED',
        415: 'STORAGE_UNSUPPORTED_RESOURCE',
      }[status] || 'STORAGE_PROVIDER_REJECTED';
  } else if ([420, 429].includes(status)) {
    code = 'STORAGE_RATE_LIMITED';
    outcome = 'rejected';
  } else if (
    [408, 499].includes(status) ||
    ['ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(diagnostic?.code)
  )
    code = 'STORAGE_TIMEOUT';
  else if (status >= 500) code = 'STORAGE_UNAVAILABLE';
  else if (
    ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE'].includes(
      diagnostic?.code,
    )
  )
    code = 'STORAGE_NETWORK';
  if (
    [400, 413, 420].includes(status) &&
    /(?:file size|quota|too large|limit exceeded)/i.test(
      String(diagnostic?.message),
    )
  )
    code = 'STORAGE_QUOTA_EXCEEDED';
  return new StorageError(code, outcome, reference);
}
