import { validMediaRoot } from '../../config/cloudinary.js';
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
    ['fake', 'cloudinary'].includes(config.MEDIA_PROVIDER) &&
    config.IMAGE_DELIVERY_POLICY === 'authenticated' &&
    (config.CLOUDINARY_FOLDER_MODE || 'dynamic') === 'dynamic' &&
    validMediaRoot(config);
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
  const reader = storage?.readImage
    ? {
        read: (asset, options) =>
          storage.readImage(
            {
              publicId: asset.cloudinary.publicId,
              resourceType: asset.cloudinary.resourceType,
              deliveryType: asset.cloudinary.deliveryType,
              version: asset.cloudinary.version,
            },
            asset.format,
            options,
          ),
      }
    : undefined;
  identity.users.setMedia({ lifecycle, reader, MediaAsset });
  return {
    cleanup,
    reader,
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
