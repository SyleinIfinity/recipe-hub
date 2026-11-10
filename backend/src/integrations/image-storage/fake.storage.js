import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { parseStorageConfig } from '../../config/cloudinary.js';
import { createStorage } from './storage.js';
import { StorageError } from './storage.error.js';

// Deliberately synthetic metadata; no image decoding and no network.
export function createFakeStorage(input = {}, { faults = [] } = {}) {
  let config;
  try {
    config = parseStorageConfig(input);
  } catch {
    throw new StorageError('STORAGE_INVALID_CONFIG');
  }
  if (config.MEDIA_PROVIDER !== 'fake')
    throw new StorageError('STORAGE_INVALID_CONFIG');
  const deleted = new Set();
  const assets = new Map(),
    queue = [...faults];
  const fault = (operation) => {
    const index = queue.findIndex((f) => f.operation === operation);
    return index < 0 ? null : queue.splice(index, 1)[0];
  };
  const hang = (signal) =>
    new Promise((_, reject) => {
      const abort = () =>
        reject(new StorageError('STORAGE_TIMEOUT', 'unknown'));
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    });
  return createStorage(config, 'fake', {
    async upload(source, options, signal) {
      const failure = fault('upload');
      if (failure?.kind === 'error') throw failure.error;
      if (failure?.kind === 'timeout') return hang(signal);
      const publicId = options.folder
        ? `${options.folder}/${options.public_id}`
        : options.public_id;
      const key = `${options.type}/${publicId}`;
      if (assets.has(key))
        throw new StorageError('STORAGE_DUPLICATE', 'rejected');
      assets.set(key, null); // Reserve before consuming stream to model concurrent uniqueness.
      const stream = Buffer.isBuffer(source)
        ? Readable.from([source], { objectMode: false })
        : source;
      const abort = () =>
        stream.destroy(new StorageError('STORAGE_TIMEOUT', 'unknown'));
      signal.addEventListener('abort', abort, { once: true });
      let bytes = 0;
      try {
        for await (const chunk of stream) {
          if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string')
            throw new StorageError('STORAGE_STREAM_FAILED', 'unknown');
          bytes += Buffer.byteLength(chunk);
        }
        if (!bytes) throw new StorageError('STORAGE_INVALID_INPUT', 'rejected');
        const result = {
          asset_id: randomUUID(),
          public_id: publicId,
          resource_type: 'image',
          type: options.type,
          secure_url: `https://images.invalid/fake/image/${options.type}/v1/${publicId}.png`,
          width: 320,
          height: 240,
          bytes,
          format: 'png',
          version: 1,
        };
        assets.set(key, result);
        if (failure?.kind === 'commit_timeout') return await hang(signal);
        return failure?.kind === 'invalid_response'
          ? { ...result, width: 0 }
          : result;
      } catch (error) {
        if (assets.get(key) === null) assets.delete(key);
        throw error instanceof StorageError
          ? error
          : new StorageError('STORAGE_STREAM_FAILED', 'unknown');
      } finally {
        signal.removeEventListener('abort', abort);
      }
    },
    async inspect(reference, signal) {
      const failure = fault('inspect');
      if (failure?.kind === 'timeout') return hang(signal);
      if (failure?.kind === 'error') throw failure.error;
      const key = `${reference.deliveryType}/${reference.publicId}`;
      if (assets.get(key)) return { metadata: assets.get(key) };
      return { outcome: deleted.has(key) ? 'absent' : 'unknown' };
    },
    async destroy(reference, signal) {
      const failure = fault('destroy');
      if (failure?.kind === 'error') throw failure.error;
      if (failure?.kind === 'timeout') return hang(signal);
      if (failure?.kind === 'invalid_response')
        return { result: 'unrecognized' };
      deleted.add(`${reference.deliveryType}/${reference.publicId}`);
      return {
        result: assets.delete(`${reference.deliveryType}/${reference.publicId}`)
          ? 'ok'
          : 'not found',
      };
    },
    url: (publicId, options) => {
      const t = options.transformation[0];
      const transforms = [
        `c_${t.crop}`,
        `w_${t.width}`,
        ...(t.height ? [`h_${t.height}`] : []),
        'f_auto',
        'q_auto',
      ].join(',');
      return `https://images.invalid/fake/image/upload/${transforms}/${options.version ? `v${options.version}/` : ''}${publicId}`;
    },
  });
}
