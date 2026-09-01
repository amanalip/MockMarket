import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const checks = [
  ['Lint', ['run', 'lint']],
  ['Type checks', ['run', 'typecheck']],
  ['Unit coverage', ['run', 'test:coverage']],
  ['Market data', ['run', 'data:validate']],
  ['Dependency audit', ['audit']],
  ['Production build', ['run', 'build']],
  ['Build artifact', ['run', 'build:verify']],
  ['Production E2E', ['run', 'test:e2e:only']],
];

for (const [label, args] of checks) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(npm, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
