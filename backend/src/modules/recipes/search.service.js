import mongoose from 'mongoose';
import { searchTokens } from './search.normalization.js';
import { searchQuery } from './search.validation.js';
import { publicRecipePipeline } from './recipe-visibility.js';
import { AppError } from '../../shared/errors.js';
export const QUERY_MAX_TIME_MS = 3000;
export const publicCardProjection = {
  _id: 1,
  slug: 1,
  title: 1,
  description: 1,
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
export function searchPipeline(User, query) {
  const [match, ...author] = publicRecipePipeline(User, searchFilter(query));
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
        ],
        count: [{ $count: 'total' }],
      },
    },
  ];
}
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
export function createSearchService({ Recipe, User }) {
  return {
    async list(raw) {
      const query = searchQuery.parse(raw);
      const [result] = await boundedAggregate(
        Recipe,
        searchPipeline(User, query),
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
