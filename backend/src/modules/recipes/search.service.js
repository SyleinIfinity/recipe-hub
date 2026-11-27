import mongoose from 'mongoose';
import { searchTokens } from './search.normalization.js';
import { searchQuery } from './search.validation.js';
import { publicRecipePipeline } from './recipe-visibility.js';
import { boundedAggregate } from '../../shared/aggregate.js';
import { interactionSummaryStages } from '../social/interaction-summary.js';
export { boundedAggregate, QUERY_MAX_TIME_MS } from '../../shared/aggregate.js';
export const publicCardProjection = {
  _id: 1,
  slug: 1,
  title: 1,
  description: 1,
  coverImageAssetId: 1,
  categoryId: 1,
  difficulty: 1,
  totalMinutes: 1,
  publishedAt: 1,
  publicAuthor: 1,
};
export function searchFilter(query) {
  const filter = {};
  if (query.q) filter.searchTokens = { $all: searchTokens(query.q) };
  if (query.category)
    filter.categoryId = new mongoose.Types.ObjectId(query.category);
  if (query.tag) filter.tags = query.tag;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.maxMinutes !== undefined)
    filter.totalMinutes = { $gte: 0, $lte: query.maxMinutes };
  if (query.ingredientIds)
    filter['ingredients.ingredientId'] = {
      [query.ingredientMatch === 'all' ? '$all' : '$in']: query.ingredientIds
        .split(',')
        .map((id) => new mongoose.Types.ObjectId(id)),
    };
  return filter;
}
export function searchPipeline(User, query, authorId) {
  const filter = searchFilter(query);
  if (authorId) filter.authorId = authorId;
  const [match, ...author] = publicRecipePipeline(User, filter);
  const direction = query.sort.startsWith('-') ? -1 : 1;
  return [
    match,
    { $sort: { publishedAt: direction, _id: direction } },
    ...author,
    { $project: publicCardProjection },
    {
      $facet: {
        rows: [
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
          ...interactionSummaryStages(User),
        ],
        count: [{ $count: 'total' }],
      },
    },
  ];
}
export function createSearchService({ Recipe, User }) {
  return {
    async list(raw, authorId) {
      const query = searchQuery.parse(raw);
      const [result] = await boundedAggregate(
        Recipe,
        searchPipeline(User, query, authorId),
      );
      return {
        rows: result.rows,
        meta: {
          page: query.page,
          limit: query.limit,
          total: result.count[0]?.total ?? 0,
        },
      };
    },
  };
}
