import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const stage = path.join(root, '.local', `milestone-1-${stamp}`);
const output = path.join(root, 'releases');
await mkdir(stage, { recursive: true });
await mkdir(output, { recursive: true });
const entries = [
  'apps',
  'packages',
  'scripts',
  'tests',
  'docs',
  'infra',
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
  'playwright.config.ts',
  '.gitignore',
  '.prettierrc.json',
  '.prettierignore',
  'README.md',
  'AGENTS.md',
  'ARCHITECTURE.md',
  'PROJECT_PLAN.md',
  'PROJECT_CONTEXT.md',
];
const denied = new Set([
  'node_modules',
  '.next',
  'dist',
  '.local',
  'coverage',
  'test-results',
  'playwright-report',
  'uploads',
]);
for (const name of entries) {
  await cp(path.join(root, name), path.join(stage, name), {
    recursive: true,
    filter(source) {
      const base = path.basename(source);
      return (
        !denied.has(base) &&
        !(base.startsWith('.env') && base !== '.env.example') &&
        !base.endsWith('.tsbuildinfo') &&
        !base.endsWith('.log')
      );
    },
  });
}
const checksums = [];
async function manifest(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await manifest(full);
    else
      checksums.push(
        `${createHash('sha256')
          .update(await readFile(full))
          .digest('hex')}  ${path.relative(stage, full).replaceAll('\\', '/')}`,
      );
  }
}
await manifest(stage);
await writeFile(path.join(stage, 'SHA256SUMS.txt'), checksums.sort().join('\n') + '\n');
const archive = path.join(
  output,
  `storyhaven-milestone-1-${stamp}.${process.platform === 'win32' ? 'zip' : 'tar.gz'}`,
);
if (process.platform === 'win32')
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      'Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($env:STORYHAVEN_PACK_DIR, $env:STORYHAVEN_PACK_ZIP)',
    ],
    {
      windowsHide: true,
      env: { ...process.env, STORYHAVEN_PACK_DIR: stage, STORYHAVEN_PACK_ZIP: archive },
    },
  );
else execFileSync('tar', ['-czf', archive, '-C', stage, '.']);
const digest = createHash('sha256')
  .update(await readFile(archive))
  .digest('hex');
await writeFile(`${archive}.sha256`, `${digest}  ${path.basename(archive)}\n`);
console.log(
  `Source handover: ${archive}\nFiles: ${checksums.length}\nSHA256: ${digest}\nSecrets, local databases, dependencies, build output and the private contract PDF are excluded.`,
);
