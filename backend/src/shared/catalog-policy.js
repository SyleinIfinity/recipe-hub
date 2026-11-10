import { AppError } from './errors.js';
export function requireCatalogAdmin(actor) {
  if (
    !actor?.user ||
    actor.user.status !== 'active' ||
    actor.user.role !== 'admin'
  )
    throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
}
export function catalogWriteError(error, code) {
  if (error.code === 11000)
    throw new AppError(409, code, 'Catalog name or lookup key already exists');
  if (error.name === 'VersionError')
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'Catalog changed; reload and retry',
    );
  throw error;
}
