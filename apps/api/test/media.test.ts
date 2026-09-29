import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
vi.mock('../src/config.js', () => ({
  config: {
    MEDIA_STORAGE: 'cloudinary',
    CLOUDINARY_CLOUD_NAME: 'demo-test',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
    NODE_ENV: 'test',
    WEB_ORIGIN: 'http://localhost:3000',
  },
  mediaDir: 'unused-test-media-dir',
}));
import { MediaAsset } from '../src/models.js';
import { saveCover, coverExists } from '../src/modules/media.js';
import { createApp } from '../src/app.js';
const key = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp';
const publicId = `storyhaven/covers/${key.replace('.webp', '')}`;
const url = `https://res.cloudinary.com/demo-test/image/upload/v123/${publicId}.webp`;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('durable cover storage', () => {
  it('uploads via backend credentials and saves the mapping only after success', async () => {
    const create = vi.spyOn(MediaAsset, 'create').mockResolvedValue({} as never);
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      expect(_url).toBe('https://api.cloudinary.com/v1_1/demo-test/image/upload');
      expect((options.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
      expect((options.body as FormData).get('public_id')).toBe(publicId);
      expect((options.body as FormData).get('overwrite')).toBe('false');
      return Response.json({ public_id: publicId, secure_url: url });
    });
    vi.stubGlobal('fetch', fetcher);
    await saveCover(key, Buffer.from('validated image'));
    expect(create).toHaveBeenCalledWith({ key, publicId, url });
  });
  it('does not record failed uploads or reveal provider errors', async () => {
    const create = vi.spyOn(MediaAsset, 'create');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('sensitive provider detail', { status: 401 })),
    );
    await expect(saveCover(key, Buffer.from('image'))).rejects.toMatchObject({
      code: 'MEDIA_UPLOAD',
      status: 502,
      message: 'Cover upload failed. Please try again.',
    });
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects unexpected external asset URLs', async () => {
    const create = vi.spyOn(MediaAsset, 'create');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ public_id: publicId, secure_url: 'https://untrusted.example/cover.webp' }),
      ),
    );
    await expect(saveCover(key, Buffer.from('image'))).rejects.toMatchObject({
      code: 'MEDIA_UPLOAD',
    });
    expect(create).not.toHaveBeenCalled();
  });
  it('accepts a cloud cover without requiring a local file', async () => {
    vi.spyOn(MediaAsset, 'exists').mockResolvedValue({ _id: 'stored' } as never);
    expect(await coverExists(key)).toBe(true);
  });
  it('delivers persisted covers through the existing URL after local files disappear', async () => {
    vi.spyOn(MediaAsset, 'findOne').mockReturnValue({
      lean: async () => ({ key, publicId, url }),
    } as never);
    const response = await request(createApp()).get(`/api/v1/media/${key}`);
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(url);
  });
});
