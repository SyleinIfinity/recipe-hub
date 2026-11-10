export function mediaAssetDTO(asset) {
  return {
    assetId: String(asset._id),
    purpose: asset.purpose,
    url: null,
    width: asset.width,
    height: asset.height,
    format: asset.format,
    bytes: asset.bytes,
    status: asset.status,
    expiresAt: asset.expiresAt,
    createdAt: asset.createdAt,
  };
}
