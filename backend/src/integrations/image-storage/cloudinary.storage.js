import { createBinaryReader } from './binary-reader.js';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Agent } from 'node:https';
import { parseStorageConfig } from '../../config/cloudinary.js';
import { createStorage } from './storage.js';
import { StorageError } from './storage.error.js';

export async function createCloudinaryStorage(input, { sdk, fetchImpl } = {}) {
  let config;
  try {
    config = parseStorageConfig(input);
  } catch {
    throw new StorageError('STORAGE_INVALID_CONFIG');
  }
  if (config.MEDIA_PROVIDER !== 'cloudinary')
    throw new StorageError('STORAGE_INVALID_CONFIG');
  try {
    sdk ||= (await import('cloudinary')).v2;
  } catch {
    throw new StorageError('STORAGE_INVALID_CONFIG');
  }
  // Do not mutate the SDK singleton; pass explicit validated credentials per call.
  try {
    if (sdk.config && (sdk.config().oauth_token || sdk.config().api_proxy))
      throw new Error();
  } catch {
    throw new StorageError('STORAGE_INVALID_CONFIG');
  }
  const credentials = {
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  };
  function call(kind, source, options, signal) {
    return new Promise((resolve, reject) => {
      let settled = false,
        stream;
      const agent = new Agent({ keepAlive: false, rejectUnauthorized: true });
      const inputStream =
        kind === 'upload'
          ? Buffer.isBuffer(source)
            ? Readable.from([source], { objectMode: false })
            : source
          : null;
      const finish = (error, result) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        if (error) {
          inputStream?.destroy();
          stream?.destroy();
        }
        agent.destroy();
        if (error) reject(error);
        else resolve(result);
      };
      const abort = () =>
        finish(new StorageError('STORAGE_TIMEOUT', 'unknown'));
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) {
        abort();
        return;
      }
      const sdkOptions = {
        ...credentials,
        ...options,
        secure: true,
        upload_prefix: 'https://api.cloudinary.com',
        timeout: config.IMAGE_STORAGE_TIMEOUT_MS,
        disable_promises: true,
        agent,
        unsigned: false,
        upload_preset: '',
      };
      try {
        if (kind === 'upload') {
          let result,
            callbackDone = false,
            streamDone = false;
          const complete = () => {
            if (callbackDone && streamDone) finish(null, result);
          };
          stream = sdk.uploader.upload_stream(sdkOptions, (error, value) => {
            if (error) return finish(error);
            result = value;
            callbackDone = true;
            complete();
          });
          if (settled) {
            stream.destroy();
            return;
          }
          // Await both stream completion and SDK callback; pipeline errors never escape.
          pipeline(inputStream, stream)
            .then(() => {
              streamDone = true;
              complete();
            })
            .catch((error) =>
              finish(
                new StorageError(
                  error?.code === 'ERR_STREAM_PREMATURE_CLOSE'
                    ? 'STORAGE_ABORTED'
                    : 'STORAGE_STREAM_FAILED',
                  'unknown',
                ),
              ),
            );
        } else sdk.uploader.destroy(source, sdkOptions, finish);
      } catch (error) {
        finish(error);
      }
    });
  }
  const read = createBinaryReader({
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    fetchImpl,
    makeUrl: (ref, format) =>
      sdk.utils.private_download_url(ref.publicId, format, {
        ...credentials,
        resource_type: 'image',
        type: 'authenticated',
        secure: true,
        upload_prefix: 'https://api.cloudinary.com',
        attachment: false,
        expires_at: Math.floor(Date.now() / 1000) + 60,
      }),
  });
  return createStorage(config, 'cloudinary', {
    read,
    async inspect(reference) {
      try {
        return {
          metadata: await sdk.api.resource(reference.publicId, {
            ...credentials,
            resource_type: 'image',
            type: 'authenticated',
            secure: true,
            upload_prefix: 'https://api.cloudinary.com',
            timeout: config.IMAGE_STORAGE_TIMEOUT_MS,
          }),
        };
      } catch (error) {
        if ((error?.http_code ?? error?.error?.http_code) === 404)
          return { outcome: 'absent' };
        throw error;
      }
    },
    upload: (source, options, signal) =>
      call('upload', source, options, signal),
    destroy: (reference, signal) =>
      call(
        'destroy',
        reference.publicId,
        {
          resource_type: reference.resourceType,
          type: reference.deliveryType,
          invalidate: true,
        },
        signal,
      ),
    url: (publicId, options) =>
      sdk.url(publicId, {
        ...options,
        cloud_name: config.CLOUDINARY_CLOUD_NAME,
        secure_distribution: 'res.cloudinary.com',
        private_cdn: false,
        cdn_subdomain: false,
        secure_cdn_subdomain: false,
        cname: null,
        shorten: false,
        use_root_path: false,
        sign_url: false,
        auth_token: false,
        urlAnalytics: false,
      }),
  });
}
