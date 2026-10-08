import { href } from '../lib/paths.js';

export function GET({ site }) {
  const sitemap = new URL(href('sitemap-index.xml'), site).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
