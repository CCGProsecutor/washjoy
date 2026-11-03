import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import adapter from '@sveltejs/adapter-static';

const root = dirname(fileURLToPath(import.meta.url));
const basePath = (process.env.VITE_BASE_PATH || '/washjoy').replace(/\/$/, '');
export default defineConfig({
  resolve: { alias: { '#lib': resolve(root, 'src/lib') } },
  plugins: [tailwindcss(), sveltekit({
    adapter: adapter({ pages: 'build', assets: 'build', fallback: '200.html' }),
    paths: { base: basePath, relative: false },
    prerender: { crawl: false, entries: ['/', '/account', '/admin', '/mine'], handleUnseenRoutes: 'ignore' },
  })]
});
