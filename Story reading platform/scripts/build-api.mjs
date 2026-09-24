import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
await build({
  entryPoints: ['src/server.ts', 'src/workers/publishing.ts'],
  outdir: 'dist',
  outbase: 'src',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: Object.keys(manifest.dependencies).filter((name) => name !== '@storyhaven/contracts'),
});
console.log('API and worker built, including shared contracts.');
