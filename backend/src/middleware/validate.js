import { AppError } from '../shared/errors.js';
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      return next(
        new AppError(
          source === 'body' ? 422 : 400,
          'VALIDATION_ERROR',
          'Invalid request data',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            code: issue.code,
          })),
        ),
      );
    req.validated = { ...req.validated, [source]: result.data };
    next();
  };
}
