const { spawnSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

function collectTests(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTests(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      files.push(absolutePath);
    }
  }

  return files;
}

const srcDir = join(__dirname, '..', 'src');
if (!statSync(srcDir).isDirectory()) {
  console.error(`Test source directory not found: ${srcDir}`);
  process.exit(1);
}

const testFiles = collectTests(srcDir).sort();

if (testFiles.length === 0) {
  console.error('No backend test files found.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--require', 'ts-node/register', '--test', ...testFiles],
  {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
  },
);

process.exit(result.status ?? 1);
