import { createHash, randomBytes, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const hash = (v: string) => createHash('sha256').update(v).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
const scrypt = promisify(rawScrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function pagination(req: Request) {
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(req.query.page ?? 1);
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .parse(req.query.limit ?? 12);
  return { page, limit, skip: (page - 1) * limit };
}
export const pageResult = (items: unknown[], total: number, page: number, limit: number) => ({
  items,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
});
export function tokens(value: string) {
  return [
    ...new Set(
      value
        .normalize('NFKC')
        .toLowerCase()
        .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [],
    ),
  ].slice(0, 300);
}
export function previewText(body: string, mode: string, value: number) {
  const segments = [...new Intl.Segmenter('bn', { granularity: 'word' }).segment(body)].filter(
    (s) => s.isWordLike,
  );
  const count = Math.max(
    0,
    Math.min(
      segments.length - 1,
      mode === 'percentage' ? Math.floor((segments.length * value) / 100) : value,
    ),
  );
  if (count === 0) return '';
  return body.slice(0, segments[count].index).trimEnd();
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: {
          code: 'VALIDATION',
          message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        },
      });
  if (error instanceof ApiError)
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  const err = error as { code?: unknown; name?: string; type?: string };
  if (err.code === 11000)
    return res
      .status(409)
      .json({
        error: {
          code: 'CONFLICT',
          message: 'This record already exists. Use a different email, slug or order.',
        },
      });
  if (err.name === 'MulterError')
    return res
      .status(400)
      .json({ error: { code: 'UPLOAD', message: 'Choose one image no larger than 5 MB.' } });
  if (err.type === 'entity.too.large' || err.type === 'entity.parse.failed')
    return res
      .status(400)
      .json({ error: { code: 'BODY', message: 'Invalid or oversized request.' } });
  console.error('Request failed', err.name ?? 'UnknownError');
  return res
    .status(500)
    .json({ error: { code: 'INTERNAL', message: 'The request could not be completed.' } });
}
