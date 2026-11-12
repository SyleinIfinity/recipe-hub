import { AppError } from '../../shared/errors.js';
export function authorizedReader(authorize, transport) {
  return async (...args) => {
    let asset = await authorize(...args);
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
        !['image/png', 'image/jpeg', 'image/webp'].includes(result.contentType)
      )
        throw new Error('Invalid delivery');
    } catch (error) {
      if (error?.code === 'STORAGE_INVALID_RESPONSE')
        throw new AppError(
          502,
          'MEDIA_DELIVERY_BAD_RESPONSE',
          'Secure image delivery returned invalid data',
        );
      throw new AppError(
        503,
        'MEDIA_DELIVERY_UNAVAILABLE',
        'Secure image delivery unavailable',
      );
    } finally {
      clearTimeout(timer);
    }
    // Buffer before headers: revoke a grant if visibility changed while storage was reading.
    asset = await authorize(...args);
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
  };
}
