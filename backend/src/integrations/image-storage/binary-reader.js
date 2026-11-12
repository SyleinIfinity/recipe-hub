import { StorageError } from './storage.error.js';
const types = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};
export function validImageBytes(buffer, contentType) {
  return contentType === 'image/png'
    ? buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : contentType === 'image/jpeg'
      ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
      : contentType === 'image/webp'
        ? buffer.toString('ascii', 0, 4) === 'RIFF' &&
          buffer.toString('ascii', 8, 12) === 'WEBP'
        : false;
}
// Internal URLs never leave this boundary. No redirects, logs or unbounded response buffering.
export function createBinaryReader({ makeUrl, cloudName, fetchImpl = fetch }) {
  return async function read(
    reference,
    format,
    { signal, maxBytes = 5 * 1024 * 1024 } = {},
  ) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1)
      throw new StorageError('STORAGE_INVALID_INPUT');
    let response;
    const limit = Math.min(maxBytes, 5 * 1024 * 1024);
    try {
      const url = new URL(makeUrl(reference, format));
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'api.cloudinary.com' ||
        url.port ||
        url.username ||
        url.password ||
        url.hash ||
        url.pathname !== `/v1_1/${cloudName}/image/download` ||
        !types[format]
      )
        throw new StorageError('STORAGE_INVALID_RESPONSE');
      response = await fetchImpl(url, {
        signal,
        redirect: 'error',
        credentials: 'omit',
        headers: { Accept: types[format] },
      });
      if (!response.ok)
        throw new StorageError(
          response.status >= 500 ? 'STORAGE_UNAVAILABLE' : 'STORAGE_PERMISSION',
        );
      const contentType = response.headers
        .get('content-type')
        ?.split(';')[0]
        .trim()
        .toLowerCase();
      const length = response.headers.get('content-length');
      if (
        contentType !== types[format] ||
        (length && (!/^\d+$/.test(length) || Number(length) > limit)) ||
        !response.body
      )
        throw new StorageError('STORAGE_INVALID_RESPONSE');
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > limit) throw new StorageError('STORAGE_INVALID_RESPONSE');
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      if (!size || !validImageBytes(buffer, contentType))
        throw new StorageError('STORAGE_INVALID_RESPONSE');
      return { buffer, contentType };
    } catch (error) {
      await response?.body?.cancel().catch(() => {});
      throw error instanceof StorageError
        ? error
        : new StorageError('STORAGE_UNAVAILABLE');
    }
  };
}
