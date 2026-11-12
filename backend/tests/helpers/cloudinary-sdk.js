import { Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
// Independent SDK-boundary stub. URL building uses the real SDK offline.
export function mockCloudinary({ faults = [] } = {}) {
  const queue = [...faults],
    assets = new Map(),
    buffers = new Map(),
    calls = [];
  function fault(operation) {
    const n = queue.findIndex((f) => f.operation === operation);
    return n < 0 ? undefined : queue.splice(n, 1)[0];
  }
  return {
    calls,
    buffers,
    sdk: {
      utils: cloudinary.utils,
      api: {
        async resource(publicId, options) {
          const metadata = assets.get(`${options.type}/${publicId}`);
          if (!metadata) throw { http_code: 404 };
          return metadata;
        },
      },
      uploader: {
        upload_stream(options, callback) {
          calls.push({ operation: 'upload', options });
          const failure = fault('upload');
          let bytes = 0;
          const chunks = [];
          const stream = new Writable({
            write(chunk, _encoding, done) {
              bytes += chunk.length;
              chunks.push(Buffer.from(chunk));
              if (failure?.kind === 'stream_error')
                done(new Error('private stream diagnostics'));
              else done();
            },
            final(done) {
              done();
              if (failure?.kind === 'timeout') return;
              if (failure?.kind === 'error') {
                queueMicrotask(() => callback(failure.error));
                return;
              }
              const publicId = options.folder
                  ? `${options.folder}/${options.public_id}`
                  : options.public_id,
                key = `${options.type}/${publicId}`;
              if (assets.has(key)) {
                queueMicrotask(() => callback(null, { existing: true }));
                return;
              }
              const result = {
                asset_id: randomUUID(),
                public_id: publicId,
                resource_type: 'image',
                type: options.type,
                secure_url: `https://res.cloudinary.com/${options.cloud_name}/image/${options.type}/v1/${publicId}.png`,
                width: 320,
                height: 240,
                bytes,
                format: 'png',
                version: 1,
                ignored_secret: 'private raw data',
              };
              assets.set(key, result);
              buffers.set(key, Buffer.concat(chunks));
              if (failure?.kind === 'commit_timeout') return;
              queueMicrotask(() =>
                callback(
                  null,
                  failure?.kind === 'invalid_response'
                    ? { ...result, width: 0 }
                    : result,
                ),
              );
            },
          });
          return stream;
        },
        destroy(publicId, options, callback) {
          calls.push({ operation: 'destroy', publicId, options });
          const failure = fault('destroy');
          buffers.delete(`${options.type}/${publicId}`);
          if (failure?.kind === 'timeout') return;
          queueMicrotask(() => {
            if (failure?.kind === 'error') callback(failure.error);
            else
              callback(null, {
                result:
                  failure?.kind === 'invalid_response'
                    ? 'unexpected'
                    : assets.delete(`${options.type}/${publicId}`)
                      ? 'ok'
                      : 'not found',
              });
          });
        },
      },
      url: (publicId, options) => {
        calls.push({ operation: 'url', publicId, options });
        return cloudinary.url(publicId, options);
      },
    },
  };
}
export const cloudConfig = {
  MEDIA_PROVIDER: 'cloudinary',
  CLOUDINARY_CLOUD_NAME: 'fixture-cloud',
  CLOUDINARY_API_KEY: '123456789012345',
  CLOUDINARY_API_SECRET: 'fixture-only-secret-not-real',
  CLOUDINARY_FOLDER_MODE: 'dynamic',
  IMAGE_DELIVERY_POLICY: 'public',
  IMAGE_STORAGE_TIMEOUT_MS: 100,
};
