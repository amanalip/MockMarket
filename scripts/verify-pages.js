import { existsSync, readFileSync } from 'node:fs';

function normalizeBasePath(value) {
  const path = value?.trim();
  if (!path || path === '/') return '/';
  return `/${path.replace(/^\/+|\/+$/g, '')}/`;
}

for (const path of ['dist/index.html', 'dist/404.html', 'dist/.nojekyll']) {
  if (!existsSync(path)) throw new Error(`${path} is missing`);
}

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH);
const html = readFileSync('dist/index.html', 'utf8');
if (!html.includes(`${basePath}assets/`)) {
  throw new Error(`dist/index.html does not use the configured base path ${basePath}`);
}
