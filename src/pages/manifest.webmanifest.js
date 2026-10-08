import { href } from '../lib/paths.js';

export function GET() {
  const manifest = {
    name: 'Патриот — военно-историческая летопись',
    short_name: 'Патриот',
    description: 'Ежедневный военно-исторический выпуск.',
    lang: 'ru',
    start_url: href(''),
    scope: href(''),
    display: 'standalone',
    background_color: '#0d0f12',
    theme_color: '#0d0f12',
    icons: [
      { src: href('icons/192.png'), sizes: '192x192', type: 'image/png' },
      { src: href('icons/512.png'), sizes: '512x512', type: 'image/png' },
      { src: href('icons/512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: href('favicon.svg'), sizes: 'any', type: 'image/svg+xml' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
