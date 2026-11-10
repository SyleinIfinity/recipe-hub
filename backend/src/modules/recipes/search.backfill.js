import mongoose from 'mongoose';
import { recipeSearchFields } from './search.normalization.js';
// One bounded batch; callers persist nextAfter and retry conflicted rows in a new pass.
export async function backfillRecipeSearch(
  Recipe,
  { apply = false, limit = 100, after } = {},
) {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 500 ||
    (after && (after.length !== 24 || !/^[a-f0-9]{24}$/i.test(after)))
  )
    throw new Error('Invalid backfill batch');
  const rows = await Recipe.find({
    searchVersion: { $ne: 1 },
    ...(after ? { _id: { $gt: new mongoose.Types.ObjectId(after) } } : {}),
  })
    .select('_id title description version')
    .sort({ _id: 1 })
    .limit(limit)
    .maxTimeMS(3000)
    .lean();
  let updated = 0;
  if (apply)
    for (const row of rows) {
      const result = await Recipe.updateOne(
        {
          _id: row._id,
          version: row.version,
          title: row.title,
          description: row.description,
          searchVersion: { $ne: 1 },
        },
        { $set: recipeSearchFields(row) },
        { timestamps: false, maxTimeMS: 3000 },
      );
      updated += result.modifiedCount;
    }
  return {
    mode: apply ? 'apply' : 'dry-run',
    scanned: rows.length,
    updated,
    conflicts: apply ? rows.length - updated : 0,
    nextAfter: rows.length ? String(rows.at(-1)._id) : null,
  };
}
