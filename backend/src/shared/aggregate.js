import { AppError } from './errors.js';
export const QUERY_MAX_TIME_MS = 3000;
export async function boundedAggregate(Model, pipeline) {
  try {
    return await Model.aggregate(pipeline).option({
      maxTimeMS: QUERY_MAX_TIME_MS,
      allowDiskUse: false,
    });
  } catch (err) {
    if (err.code === 50)
      throw new AppError(
        503,
        'QUERY_TIMEOUT',
        'Query took too long; narrow the filters',
      );
    throw err;
  }
}
