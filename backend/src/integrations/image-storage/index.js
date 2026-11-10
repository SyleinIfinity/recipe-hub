import { parseStorageConfig } from '../../config/cloudinary.js';
import { createFakeStorage } from './fake.storage.js';
import { StorageError } from './storage.error.js';
export { newImageId } from './storage.contract.js';
export { StorageError } from './storage.error.js';

export async function createImageStorage(input = {}, dependencies = {}) {
  let config;
  try {
    config = parseStorageConfig(input);
  } catch {
    throw new StorageError('STORAGE_INVALID_CONFIG');
  }
  if (config.MEDIA_PROVIDER === 'fake')
    return createFakeStorage(config, dependencies);
  const { createCloudinaryStorage } = await import('./cloudinary.storage.js');
  return createCloudinaryStorage(config, dependencies);
}
