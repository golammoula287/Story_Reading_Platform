import { expect, it } from 'vitest';
import { webOriginSchema } from '../src/web-origin.js';

const origin = 'https://story-reading-platform-zeta.vercel.app';
it('normalizes the exact dashboard value from the production crash log', () => {
  expect(webOriginSchema.parse(`WEB_ORIGIN=[${origin}](${origin})`)).toBe(origin);
});
it('accepts plain origins, copied assignments, and quoted values', () => {
  for (const value of [origin, ` ${origin}/ `, `WEB_ORIGIN=${origin}`, `WEB_ORIGIN="${origin}"`])
    expect(webOriginSchema.parse(value)).toBe(origin);
  expect(webOriginSchema.parse(undefined)).toBe('http://localhost:3000');
});
it('rejects malformed and unsafe origins with validation errors rather than URL exceptions', () => {
  for (const value of [
    '',
    'bad-url',
    'https://user:secret@example.com',
    `${origin}/api`,
    `${origin}?x=1`,
    `${origin}#hash`,
    'javascript:alert(1)',
    `[${origin}](https://other.example)`,
    `${origin},https://other.example`,
  ]) {
    const parsed = webOriginSchema.safeParse(value);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.message).not.toContain('secret');
  }
});
