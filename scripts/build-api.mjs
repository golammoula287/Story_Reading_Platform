import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = process.cwd();
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(apiRoot, 'package.json'), 'utf8'));
await build({
  entryPoints: ['src/server.ts', 'src/workers/publishing.ts'],
  outdir: 'dist',
  outbase: 'src',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  alias: {
    '@storyhaven/contracts': path.join(repositoryRoot, 'packages/contracts/src/index.ts'),
  },
  external: Object.keys(manifest.dependencies).filter((name) => name !== '@storyhaven/contracts'),
});
console.log('API and worker built, including shared contracts.');
