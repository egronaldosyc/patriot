import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import searchIndex from './integrations/search-index.mjs';

// Адрес и base подставляет GitHub Actions (actions/configure-pages), локально — корень.
const site = process.env.SITE_URL || 'http://localhost:4321';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') }), searchIndex()],
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
