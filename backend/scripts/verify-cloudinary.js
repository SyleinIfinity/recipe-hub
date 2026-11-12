import { v2 as sdk } from 'cloudinary';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { createImageStorage } from '../src/integrations/image-storage/index.js';
// This explicitly invoked verification command never starts the app/DB/SMTP/cleanup worker.
export async function verifyCloudinary(
  env = process.env,
  { client = sdk, storageFactory = createImageStorage } = {},
) {
  const names = [
    'MEDIA_PROVIDER',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_FOLDER_MODE',
    'CLOUDINARY_ASSET_FOLDER',
    'IMAGE_DELIVERY_POLICY',
  ];
  const report = {
    configuration: Object.fromEntries(
      names.map((name) => [name, env[name] ? 'present' : 'missing']),
    ),
    validation: 'not_verified',
    connection: 'not_verified',
    folderMode: 'not_verified',
    smoke: 'not_verified',
    cleanup: 'not_started',
  };
  let config;
  try {
    config = parseEnv(env);
    report.validation = 'verified';
  } catch {
    report.validation = 'invalid_config';
    return report;
  }
  if (config.MEDIA_PROVIDER !== 'cloudinary') {
    report.connection = 'blocked_provider_not_selected';
    return report;
  }
  const credentials = {
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
    upload_prefix: 'https://api.cloudinary.com',
    timeout: config.IMAGE_STORAGE_TIMEOUT_MS,
  };
  const safeFailure = (e) => ({
    status: 'not_verified',
    code: /^[A-Z_]{3,60}$/.test(e?.code || '')
      ? e.code
      : 'PROVIDER_CHECK_FAILED',
    ...(Number.isInteger(e?.http_code ?? e?.error?.http_code)
      ? { httpStatus: e.http_code ?? e.error.http_code }
      : {}),
  });
  try {
    const ping = await client.api.ping(credentials);
    report.connection = ping.status === 'ok' ? 'verified' : 'not_verified';
  } catch (e) {
    report.connection = safeFailure(e);
    return report;
  }
  try {
    const remote = await client.api.config({ ...credentials, settings: true });
    report.folderMode =
      remote.settings?.folder_mode === 'dynamic'
        ? 'verified_dynamic'
        : 'blocked_not_dynamic';
  } catch (e) {
    report.folderMode = safeFailure(e);
    return report;
  }
  if (
    config.NODE_ENV === 'production' ||
    report.folderMode !== 'verified_dynamic' ||
    config.CLOUDINARY_FOLDER_MODE !== 'dynamic' ||
    config.CLOUDINARY_ASSET_FOLDER !== 'recipe-hub' ||
    config.IMAGE_DELIVERY_POLICY !== 'authenticated'
  ) {
    report.smoke = 'blocked_safety_preconditions';
    return report;
  }
  const storage = await storageFactory(config),
    publicId = randomUUID(),
    assetFolder = `recipe-hub/_verification/${randomUUID()}`;
  const reference = {
    publicId,
    resourceType: 'image',
    deliveryType: 'authenticated',
  };
  // Establish absence before claiming this random identifier for verification.
  try {
    await client.api.resource(publicId, {
      ...credentials,
      resource_type: 'image',
      type: 'authenticated',
    });
    report.smoke = 'blocked_identifier_already_exists';
    return report;
  } catch (error) {
    if ((error?.http_code ?? error?.error?.http_code) !== 404) {
      report.smoke = safeFailure(error);
      return report;
    }
  }
  let started = false;
  try {
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#e0c090' },
    })
      .png()
      .toBuffer();
    started = true;
    const uploaded = await new Promise((resolve, reject) => {
      const stream = client.uploader.upload_stream(
        {
          ...credentials,
          public_id: publicId,
          asset_folder: assetFolder,
          use_asset_folder_as_public_id_prefix: false,
          type: 'authenticated',
          resource_type: 'image',
          overwrite: false,
          unique_filename: false,
          use_filename: false,
        },
        (error, result) => (error ? reject(error) : resolve(result)),
      );
      stream.on('error', reject);
      stream.end(bytes);
    });
    if (uploaded.existing === true) {
      started = false;
      throw new Error('Identifier already existed');
    }
    if (
      uploaded.public_id !== publicId ||
      uploaded.type !== 'authenticated' ||
      uploaded.asset_folder !== assetFolder
    )
      throw new Error('Invalid response');
    const result = await storage.readImage(reference, 'png', {
      maxBytes: 4096,
    });
    report.smoke = {
      status:
        result.buffer.equals(bytes) && result.contentType === 'image/png'
          ? 'verified'
          : 'not_verified',
      authenticatedUpload: true,
      serverSideBinaryRead: result.contentType === 'image/png',
      bytesMatch: result.buffer.equals(bytes),
      bytes: result.buffer.length,
    };
  } catch (e) {
    if (
      Number(e?.http_code ?? e?.error?.http_code) >= 400 &&
      Number(e?.http_code ?? e?.error?.http_code) < 500 &&
      ![408, 420, 429, 499].includes(
        Number(e?.http_code ?? e?.error?.http_code),
      )
    )
      started = false;
    report.smoke = safeFailure(e);
  } finally {
    if (started)
      try {
        const result = await storage.destroyImage(reference);
        report.cleanup =
          result.outcome === 'confirmed' ? 'verified' : 'not_verified';
      } catch (e) {
        report.cleanup = safeFailure(e);
      }
  }
  return report;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const report = await verifyCloudinary();
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.smoke?.status !== 'verified' || report.cleanup !== 'verified')
      process.exitCode = 1;
  } catch {
    process.stdout.write(
      '{"status":"not_verified","code":"VERIFICATION_FAILED"}\n',
    );
    process.exitCode = 1;
  }
}
