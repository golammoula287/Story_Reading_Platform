import { mkdir, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config, mediaDir } from '../config.js';
import { MediaAsset } from '../models.js';
import { ApiError } from '../lib.js';

export async function saveCover(key: string, buffer: Buffer) {
  if (config.MEDIA_STORAGE === 'local') {
    await mkdir(mediaDir, { recursive: true });
    await writeFile(path.join(mediaDir, key), buffer);
    return;
  }
  const publicId = `storyhaven/covers/${key.replace(/\.webp$/, '')}`;
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/webp' }), key);
  form.append('public_id', publicId);
  form.append('overwrite', 'false');
  let uploaded: { public_id?: string; secure_url?: string };
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.CLOUDINARY_API_KEY}:${config.CLOUDINARY_API_SECRET}`).toString('base64')}`,
        },
        body: form,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!response.ok) throw new Error('Upload rejected');
    uploaded = await response.json();
    const url = new URL(uploaded.secure_url || '');
    if (
      uploaded.public_id !== publicId ||
      url.protocol !== 'https:' ||
      url.hostname !== 'res.cloudinary.com' ||
      !url.pathname.startsWith(`/${config.CLOUDINARY_CLOUD_NAME}/image/upload/`) ||
      url.username ||
      url.password
    )
      throw new Error('Unexpected upload response');
  } catch {
    throw new ApiError(502, 'MEDIA_UPLOAD', 'Cover upload failed. Please try again.');
  }
  // Database mapping survives backend restarts and keeps existing cover-key URLs compatible.
  await MediaAsset.create({ key, publicId, url: uploaded.secure_url });
}

export async function coverExists(key: string) {
  if (await MediaAsset.exists({ key })) return true;
  try {
    await access(path.join(mediaDir, key));
    return true;
  } catch {
    return false;
  }
}
