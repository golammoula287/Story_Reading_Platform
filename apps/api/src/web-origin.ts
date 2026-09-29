import { z } from 'zod';

export const webOriginSchema = z
  .string()
  .default('http://localhost:3000')
  .transform((input, ctx) => {
    let value = input.trim().replace(/^WEB_ORIGIN\s*=\s*/, '');
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1).trim();
    // Accept a copied link only when its displayed URL and target agree.
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(value);
    if (link && link[1] === link[2]) value = link[2];
    try {
      const url = new URL(value);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      )
        throw new Error('Invalid origin');
      return url.origin;
    } catch {
      ctx.addIssue({
        code: 'custom',
        message:
          'WEB_ORIGIN must be the frontend HTTP(S) origin without a path, query or credentials.',
      });
      return z.NEVER;
    }
  });
