import { parseArgs } from 'node:util';
import { parseEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { createRecipeModel } from '../src/modules/recipes/recipe.model.js';
import { backfillRecipeSearch } from '../src/modules/recipes/search.backfill.js';
const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '100' },
    after: { type: 'string' },
  },
});
const db = createDatabase(parseEnv(process.env));
try {
  await db.connect();
  const result = await backfillRecipeSearch(createRecipeModel(db.connection), {
    apply: values.apply,
    limit: Number(values.limit),
    after: values.after,
  });
  console.log(JSON.stringify(result));
} catch {
  console.error(
    'Recipe search backfill failed; no credentials or document contents logged',
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
