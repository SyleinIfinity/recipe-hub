import { AppError } from '../../shared/errors.js';
import { recipeReferences } from './recipe-reference.js';
const missing = () => new AppError(404, 'MEDIA_NOT_FOUND', 'Image not found');
// Transport is optional and supplied only by trusted composition, never HTTP input.
export function createRecipeMedia({
  Recipe,
  User,
  MediaAsset,
  publication,
  transport,
}) {
  async function authorize(actor, recipeId, assetId) {
    const recipe = await Recipe.findOne({
      _id: recipeId,
      deletedAt: null,
      creationState: 'complete',
      moderationStatus: 'normal',
    });
    if (!recipe || !MediaAsset) throw missing();
    const entry = recipeReferences(recipe).find(
      (v) => v.assetId === String(assetId),
    );
    if (!entry) throw missing();
    const asset = await MediaAsset.findOne({
      _id: assetId,
      ownerId: recipe.authorId,
      status: 'attached',
      uploadOutcome: 'confirmed',
      attachmentIntent: null,
      deleteRequestedAt: null,
      purpose: entry.target.kind,
      'attachedTo.kind': entry.target.kind,
      'attachedTo.resourceId': recipe._id,
      'cloudinary.deliveryType': 'authenticated',
    });
    if (
      !asset ||
      (asset.attachedTo?.stepId ?? null) !== (entry.target.stepId ?? null)
    )
      throw missing();
    const owner =
      actor?.user?.status === 'active' &&
      String(actor.user._id) === String(recipe.authorId) &&
      (await User.exists({ _id: recipe.authorId, status: 'active' }));
    if (!owner && !(await publication.isPublic(recipe._id))) throw missing();
    return asset;
  }
  return {
    authorize,
    async read(actor, recipeId, assetId) {
      let asset = await authorize(actor, recipeId, assetId);
      if (!transport)
        throw new AppError(
          503,
          'MEDIA_DELIVERY_UNAVAILABLE',
          'Secure image delivery unavailable',
        );
      let result, timer;
      const abort = new AbortController();
      try {
        result = await Promise.race([
          transport.read(asset, {
            signal: abort.signal,
            maxBytes: 5 * 1024 * 1024,
          }),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              abort.abort();
              reject(new Error('Deadline'));
            }, 3000);
          }),
        ]);
        if (
          !Buffer.isBuffer(result?.buffer) ||
          !result.buffer.length ||
          result.buffer.length > 5 * 1024 * 1024 ||
          !['image/png', 'image/jpeg', 'image/webp'].includes(
            result.contentType,
          )
        )
          throw new Error('Invalid delivery');
      } catch {
        throw new AppError(
          503,
          'MEDIA_DELIVERY_UNAVAILABLE',
          'Secure image delivery unavailable',
        );
      } finally {
        clearTimeout(timer);
      }
      // Buffer before headers: revoke a grant if visibility changed while storage was reading.
      asset = await authorize(actor, recipeId, assetId);
      if (
        result.buffer.length !== asset.bytes ||
        result.contentType !==
          { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[
            asset.format
          ]
      )
        throw new AppError(
          503,
          'MEDIA_DELIVERY_UNAVAILABLE',
          'Secure image delivery unavailable',
        );
      return result;
    },
  };
}
