import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { jsonSchema } from './src/model/schema.ts';
export default defineConfig({
  base: process.env.VITE_BASE ?? '/riderboard/',
  plugins: [
    {
      name: 'offline-shell-and-schema',
      generateBundle(_options, bundle) {
        this.emitFile({
          type: 'asset',
          fileName: 'riderboard.schema.json',
          source: JSON.stringify(jsonSchema, null, 2),
        });
        const files = [
          ...new Set([...Object.keys(bundle), 'index.html', 'favicon.svg', 'riderboard.schema.json']),
        ];
        const hash = createHash('sha256').update(JSON.stringify(bundle)).digest('hex').slice(0, 12);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `
const PREFIX = 'riderboard:' + self.registration.scope;
const CACHE = PREFIX + '${hash}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new URL(file, self.registration.scope).href))).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request.mode === 'navigate' ? new URL('index.html', self.registration.scope).href : event.request, { ignoreVary: true });
    return cached || fetch(event.request);
  }));
});`,
        });
      },
    },
  ],
});
