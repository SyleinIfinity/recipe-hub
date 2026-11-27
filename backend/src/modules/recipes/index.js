import { createBookmarkModel } from '../bookmarks/bookmark.model.js';
import { bookmarkRoutes } from '../bookmarks/bookmark.routes.js';
import { createMembershipReader } from '../bookmarks/membership.js';
import { createSocial } from '../social/index.js';
import { createFavoriteModel } from '../favorites/favorite.model.js';
import { createRecipeRelationService } from '../favorites/favorite.service.js';
import { createRecipeRelationController } from '../favorites/favorite.controller.js';
import { favoriteRoutes } from '../favorites/favorite.routes.js';
import { createPublicationService } from './publication.service.js';
import { createRecipeMedia } from './recipe-media.service.js';
import { createRecipeModel } from './recipe.model.js';
import { createRecipeService } from './recipe.service.js';
import { createRecipeController } from './recipe.controller.js';
import { recipeRoutes } from './recipe.routes.js';
import { authenticate } from '../../middleware/authenticate.js';
export async function createRecipes({ connection, identity, catalog, media }) {
  const Recipe = createRecipeModel(connection);
  await Recipe.createIndexes();
  const service = createRecipeService({ Recipe, ...catalog.models, media });
  const publication = createPublicationService({
    Recipe,
    User: identity.models.User,
    ...catalog.models,
    MediaAsset: media.MediaAsset,
  });
  const Favorite = createFavoriteModel(connection);
  const Bookmark = createBookmarkModel(connection);
  await Promise.all([Favorite.createIndexes(), Bookmark.createIndexes()]);
  const shared = { Recipe, User: identity.models.User, publication };
  const favorites = createRecipeRelationService({
    ...shared,
    Relation: Favorite,
  });
  const bookmarks = createRecipeRelationService({
    ...shared,
    Relation: Bookmark,
  });
  const requireAuth = authenticate(
    identity.sessions,
    identity.security.sessionCookie,
  );
  const writeLimit = identity.security.limit(identity.security.socialRateLimit);
  const favoriteRouter = favoriteRoutes(
    createRecipeRelationController(favorites, 'favorited'),
    requireAuth,
    writeLimit,
  );
  const bookmarkRouter = bookmarkRoutes(
    createRecipeRelationController(bookmarks, 'saved'),
    createMembershipReader({ ...shared, Favorite, Bookmark }),
    requireAuth,
    writeLimit,
    identity.security.limit(600),
  );
  const social = await createSocial({
    connection,
    identity,
    Recipe,
    publication,
  });
  const images = createRecipeMedia({
    Recipe,
    User: identity.models.User,
    MediaAsset: media.MediaAsset,
    publication,
    transport: media.reader,
  });
  const optionalAuth = async (req, _res, next) => {
    if (req.cookies[identity.security.sessionCookie])
      req.actor = await identity.sessions.authenticate(
        req.cookies[identity.security.sessionCookie],
      );
    next();
  };
  return {
    social,
    Favorite,
    favorites,
    favoriteRouter,
    Bookmark,
    bookmarks,
    bookmarkRouter,
    publication,
    images,
    Recipe,
    service,
    router: recipeRoutes(
      createRecipeController(service, publication, images),
      requireAuth,
      optionalAuth,
      identity.security.limit(600),
    ),
  };
}
