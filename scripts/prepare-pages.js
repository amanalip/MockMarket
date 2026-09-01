import { copyFileSync, existsSync } from 'node:fs';

const indexPath = new URL('../dist/index.html', import.meta.url);
const fallbackPath = new URL('../dist/404.html', import.meta.url);

if (!existsSync(indexPath)) {
  throw new Error('dist/index.html is missing; run this script after vite build');
}

copyFileSync(indexPath, fallbackPath);
