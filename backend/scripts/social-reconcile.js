import { parseArgs } from 'node:util';
import { parseEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { createAuditLogModel } from '../src/modules/users/audit-log.model.js';
import { createUserModel } from '../src/modules/users/user.model.js';
import { createRecipeModel } from '../src/modules/recipes/recipe.model.js';
import { createCommentModel } from '../src/modules/comments/comment.model.js';
import { createReportModel } from '../src/modules/reports/report.model.js';
import { createModerationService } from '../src/modules/moderation/moderation.service.js';
import { createCommentService } from '../src/modules/comments/comment.service.js';
const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '20' },
  },
});
const limit = Number(values.limit);
if (!Number.isInteger(limit) || limit < 1 || limit > 100)
  throw new Error('Use a batch limit from 1 to 100');
const db = createDatabase(parseEnv(process.env));
try {
  await db.connect();
  const shared = {
    AuditLog: createAuditLogModel(db.connection),
    User: createUserModel(db.connection),
    Recipe: createRecipeModel(db.connection),
    Comment: createCommentModel(db.connection),
    Report: createReportModel(db.connection),
  };
  const options = { limit, dryRun: !values.apply };
  const result = {
    moderation: await createModerationService(shared).reconcile(options),
    comments: await createCommentService(shared).reconcile(options),
  };
  console.log(JSON.stringify(result));
  if (
    values.apply &&
    result.moderation.uncertain + result.comments.uncertain > 0
  )
    process.exitCode = 2;
} catch {
  console.error(
    'Social reconciliation incomplete; inspect pending operation metadata without exposing credentials',
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
