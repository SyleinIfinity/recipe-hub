import { createSocial } from '../social/index.js';
import { createFavoriteModel } from '../favorites/favorite.model.js';
import { createFavoriteService } from '../favorites/favorite.service.js';
import { createFavoriteController } from '../favorites/favorite.controller.js';
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
  await Favorite.createIndexes();
  const favorites = createFavoriteService({
    Favorite,
    Recipe,
    User: identity.models.User,
    publication,
  });
  const favoriteRouter = favoriteRoutes(
    createFavoriteController(favorites),
    authenticate(identity.sessions, identity.security.sessionCookie),
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
    publication,
    images,
    Recipe,
    service,
    router: recipeRoutes(
      createRecipeController(service, publication, images),
      authenticate(identity.sessions, identity.security.sessionCookie),
      optionalAuth,
      identity.security.limit(600),
    ),
  };
}
