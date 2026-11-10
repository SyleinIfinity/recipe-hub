import { mediaAssetDTO } from './media.dto.js';
export function createMediaController(service, lifecycle) {
  return {
    async list(req, res) {
      const { assets, meta } = await lifecycle.listOwnedMedia(
        req.actor,
        req.validated.query,
      );
      res.json({ success: true, data: assets.map(mediaAssetDTO), meta });
    },
    async remove(req, res) {
      const asset = await lifecycle.requestDeletion(
        req.actor,
        req.validated.params.assetId,
      );
      res
        .status(asset.status === 'deleted' ? 200 : 202)
        .json({ success: true, data: mediaAssetDTO(asset) });
    },
    async upload(req, res) {
      req.processingImage = true;
      try {
        const asset = await service.uploadImage(
          req.actor,
          req.mediaInput.file,
          req.mediaInput.purpose,
          req.uploadKey,
        );
        if (!res.destroyed)
          res.status(201).json({ success: true, data: mediaAssetDTO(asset) });
      } finally {
        req.releaseUpload?.();
      }
    },
  };
}
