import { StorageError, providerError } from './storage.error.js';
import {
  prepareUpload,
  validateReference,
  deliveryOptions,
  normalizeUpload,
  safeUrl,
} from './storage.contract.js';

export function createStorage(config, provider, transport) {
  async function execute(reference, operation) {
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        operation(controller.signal),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(new StorageError('STORAGE_TIMEOUT', 'unknown', reference));
            controller.abort();
          }, config.IMAGE_STORAGE_TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      throw providerError(error, reference);
    } finally {
      clearTimeout(timer);
    }
  }
  return Object.freeze({
    async uploadImage(input) {
      const prepared = prepareUpload(input, config);
      const raw = await execute(prepared.reference, (signal) =>
        transport.upload(prepared.source, prepared.options, signal),
      );
      return normalizeUpload(raw, prepared, provider, config);
    },
    async inspectImage(input, assetFolder) {
      const reference = validateReference(input, config);
      if (!transport.inspect) return { outcome: 'unknown' };
      const raw = await execute(reference, (signal) =>
        transport.inspect(reference, signal),
      );
      if (raw?.outcome === 'absent') return { outcome: 'absent' };
      if (!raw?.metadata) return { outcome: 'unknown' };
      return {
        outcome: 'found',
        asset: normalizeUpload(
          raw.metadata,
          { reference, folder: assetFolder },
          provider,
          config,
        ),
      };
    },
    async destroyImage(input) {
      const reference = validateReference(input, config);
      const raw = await execute(reference, (signal) =>
        transport.destroy(reference, signal),
      );
      if (!['ok', 'not found'].includes(raw?.result))
        throw new StorageError(
          'STORAGE_INVALID_RESPONSE',
          'unknown',
          reference,
        );
      return {
        outcome: 'confirmed',
        status: raw.result === 'ok' ? 'deleted' : 'not_found',
      };
    },
    buildDeliveryUrl(input, options) {
      const reference = validateReference(input, config);
      const allowed = deliveryOptions(options, reference, config);
      try {
        const url = transport.url(reference.publicId, allowed);
        if (
          !safeUrl(
            url,
            provider === 'fake' ? 'images.invalid' : 'res.cloudinary.com',
            provider === 'fake' ? 'fake' : config.CLOUDINARY_CLOUD_NAME,
          )
        )
          throw new StorageError('STORAGE_INVALID_RESPONSE');
        return url;
      } catch (error) {
        throw error instanceof StorageError
          ? error
          : new StorageError('STORAGE_URL_FAILED');
      }
    },
  });
}
