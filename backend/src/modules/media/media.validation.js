import Busboy from 'busboy';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
export const MiB = 1024 * 1024;
export const purposeSchema = z.enum(['avatar', 'recipe_cover', 'recipe_step']);
export const keySchema = z.uuidv4();
const invalid = () =>
  new AppError(
    415,
    'MEDIA_INVALID_FILE',
    'A valid JPEG, PNG or WebP image is required',
  );
const malformed = () =>
  new AppError(
    400,
    'MEDIA_INVALID_MULTIPART',
    'Expected exactly one file and one purpose',
  );
const tooLarge = () =>
  new AppError(413, 'MEDIA_TOO_LARGE', 'Image exceeds the byte limit');
export function mediaHeaders(req, _res, next) {
  if (Object.keys(req.query).length)
    throw new AppError(
      400,
      'MEDIA_INVALID_QUERY',
      'Query parameters are not accepted',
    );
  const key = keySchema.safeParse(req.get('Idempotency-Key'));
  if (!key.success)
    throw new AppError(
      400,
      'MEDIA_INVALID_KEY',
      'Idempotency-Key must be a UUID v4',
    );
  req.uploadKey = key.data.toLowerCase();
  next();
}
export function multipart(req, res, next) {
  if (!req.is('multipart/form-data') || req.get('content-encoding'))
    return next(malformed());
  let parser;
  try {
    parser = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * MiB + 1,
        files: 1,
        fields: 1,
        parts: 3,
        fieldSize: 32,
        fieldNameSize: 32,
      },
    });
  } catch {
    return next(malformed());
  }
  let finished = false,
    file,
    purpose,
    bytes = 0,
    fileCount = 0;
  const timer = setTimeout(
    () =>
      finish(
        new AppError(
          400,
          'MEDIA_UPLOAD_TIMEOUT',
          'Multipart upload deadline exceeded',
        ),
      ),
    15000,
  );
  function finish(error) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    res.removeListener('close', abort);
    req.removeListener('aborted', abort);
    req.removeListener('error', abort);
    req.removeListener('data', count);
    req.unpipe(parser);
    if (error) {
      // Stop parsing/buffering immediately; close this connection after the error response.
      res.set('Connection', 'close');
      req.resume();
      parser.destroy();
      return next(error);
    }
    req.mediaInput = { file, purpose };
    next();
  }
  const abort = () => finish(malformed());
  const count = (chunk) => {
    bytes += chunk.length;
    if (bytes > 5 * MiB + 16384) finish(tooLarge());
  };
  res.once('close', abort);
  req.on('aborted', abort).on('error', abort).on('data', count);
  parser.on('file', (name, stream, info) => {
    fileCount++;
    stream.on('error', abort);
    if (finished || name !== 'file' || fileCount !== 1) {
      stream.resume();
      return finish(malformed());
    }
    const chunks = [];
    let size = 0;
    stream.on('limit', () => finish(tooLarge()));
    stream.on('data', (chunk) => {
      size += chunk.length;
      if (size > (purpose === 'avatar' ? 2 : 5) * MiB)
        return finish(tooLarge());
      if (!finished) chunks.push(chunk);
    });
    stream.on('end', () => {
      if (stream.truncated) return finish(tooLarge());
      if (!finished)
        file = { buffer: Buffer.concat(chunks), mime: info.mimeType };
    });
  });
  parser.on('field', (name, value, info) => {
    if (
      name !== 'purpose' ||
      purpose !== undefined ||
      info.valueTruncated ||
      info.nameTruncated
    )
      return finish(malformed());
    purpose = value;
  });
  for (const event of ['filesLimit', 'fieldsLimit', 'partsLimit'])
    parser.on(event, () => finish(malformed()));
  parser.on('error', abort);
  parser.on('close', () => {
    if (!finished) finish(fileCount === 1 && file ? null : malformed());
  });
  req.pipe(parser);
}
export async function validateImage(file, purpose) {
  if (!purposeSchema.safeParse(purpose).success)
    throw new AppError(422, 'MEDIA_INVALID_PURPOSE', 'Invalid image purpose');
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length)
    throw invalid();
  const maxBytes = (purpose === 'avatar' ? 2 : 5) * MiB;
  if (file.buffer.length > maxBytes) throw tooLarge();
  const b = file.buffer;
  const format = b.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    ? 'jpeg'
    : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? 'png'
      : b.toString('ascii', 0, 4) === 'RIFF' &&
          b.toString('ascii', 8, 12) === 'WEBP'
        ? 'webp'
        : null;
  if (!format || file.mime !== `image/${format}`) throw invalid();
  const dimensionError = () =>
    new AppError(
      422,
      'MEDIA_DIMENSIONS_EXCEEDED',
      'Image must be static, at most 20 megapixels and 10000 pixels per side',
    );
  try {
    const options = {
      limitInputPixels: 20000000,
      failOn: 'warning',
      sequentialRead: true,
    };
    const meta = await sharp(b, options).metadata();
    if (meta.format !== format) throw invalid();
    if (
      !meta.width ||
      !meta.height ||
      meta.width > 10000 ||
      meta.height > 10000 ||
      meta.width * meta.height > 20000000 ||
      (meta.pages || 1) !== 1
    )
      throw dimensionError();
    // Force full decode, remove EXIF and trailing payloads, upload canonical image bytes.
    const { data, info } = await sharp(b, options)
      .rotate()
      .toFormat(format)
      .timeout({ seconds: 5 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > maxBytes) throw tooLarge();
    return {
      source: data,
      width: info.width,
      height: info.height,
      bytes: data.length,
      format: format === 'jpeg' ? 'jpg' : format,
      fingerprint: createHash('sha256')
        .update(purpose)
        .update('\0')
        .update(b)
        .digest('hex'),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (/pixel limit/i.test(error.message)) throw dimensionError();
    throw invalid();
  }
}
