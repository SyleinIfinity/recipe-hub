import { authorizedReader } from '../media/authorized-reader.js';
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
  return { authorize, read: authorizedReader(authorize, transport) };
}
