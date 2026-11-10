import { createRecipeModel } from '../recipes/recipe.model.js';
import { createRecipeReferences } from '../recipes/recipe-reference.js';
import { createMediaLifecycle } from './media-lifecycle.service.js';
import { createMediaCleanup } from './media-cleanup.js';
import { createUserMediaReferences } from './media-reference.js';
import { createImageStorage } from '../../integrations/image-storage/index.js';
import { authenticate } from '../../middleware/authenticate.js';
import { createMediaAssetModel } from './media-asset.model.js';
import { createMediaService } from './media.service.js';
import { createMediaController } from './media.controller.js';
import { mediaRoutes } from './media.routes.js';
export async function createMedia({
  connection,
  identity,
  config,
  storage,
  logger,
  references,
}) {
  const enabled =
    config.MEDIA_PROVIDER === 'fake' &&
    config.IMAGE_DELIVERY_POLICY === 'authenticated' &&
    (config.CLOUDINARY_FOLDER_MODE || 'dynamic') === 'dynamic' &&
    config.CLOUDINARY_ASSET_FOLDER === 'recipe-hub';
  // Preserve disabled Foundation startup without creating a media collection or making remote calls.
  const MediaAsset = enabled ? createMediaAssetModel(connection) : null;
  if (enabled) await MediaAsset.createIndexes();
  storage ||= enabled ? await createImageStorage(config) : null;
  const service = createMediaService({ MediaAsset, storage, config });
  references ||= enabled
    ? createRecipeReferences({
        Recipe: createRecipeModel(connection),
        User: identity.models.User,
      })
    : createUserMediaReferences(identity.models.User);
  const lifecycle = createMediaLifecycle({
    MediaAsset,
    service,
    references,
    config,
  });
  const cleanup = createMediaCleanup({
    MediaAsset,
    storage,
    service,
    lifecycle,
    references,
    config,
    logger,
  });
  return {
    cleanup,
    lifecycle,
    MediaAsset,
    service,
    router: mediaRoutes(
      createMediaController(service, lifecycle),
      authenticate(identity.sessions, identity.security.sessionCookie),
      identity.security,
      service.assertEnabled,
      config.MEDIA_UPLOAD_RATE_LIMIT,
    ),
  };
}
