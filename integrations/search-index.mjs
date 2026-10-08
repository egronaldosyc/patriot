// Поисковый индекс Pagefind: строится после сборки, по одной записи на материал и на выпуск.
// Индекс разбит на фрагменты, браузер подгружает только нужные — архив за годы не тяжелеет.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';
import { normalizeIssue, eraOf } from '../src/lib/normalize.js';
import { longDate, MONTHS_NOM, parts } from '../src/lib/dates.js';

async function readIssues(root) {
  const dirs = ['data'];
  if (process.env.PATRIOT_FIXTURES === '1') dirs.push('fixtures');
  const issues = new Map();
  for (const dir of dirs) {
    const abs = path.join(root, dir);
    let names = [];
    try {
      names = await readdir(abs);
    } catch {
      continue;
    }
    for (const name of names.filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n))) {
      try {
        const raw = JSON.parse(await readFile(path.join(abs, name), 'utf8'));
        const { issue } = normalizeIssue(raw, name.slice(0, 10));
        if (issue) issues.set(issue.date, issue);
      } catch (e) {
        console.warn(`[search] пропущен ${dir}/${name}: ${e.message}`);
      }
    }
  }
  return [...issues.values()];
}

export default function searchIndex() {
  let root = process.cwd();
  return {
    name: 'patriot-search-index',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },
      'astro:build:done': async ({ dir, logger }) => {
        const issues = await readIssues(root);
        const { index, errors } = await pagefind.createIndex({ forceLanguage: 'ru' });
        if (!index) throw new Error(`Pagefind не запустился: ${errors?.join('; ')}`);

        let records = 0;
        for (const issue of issues) {
          const { y, m } = parts(issue.date);
          const month = `${MONTHS_NOM[m - 1]} ${y}`;
          const sortKey = issue.date.replaceAll('-', '');
          // Pagefind сам добавляет base сайта (по адресу своего бандла), поэтому адреса — от корня.
          const issueUrl = `/${issue.date}/`;

          await index.addCustomRecord({
            url: issueUrl,
            language: 'ru',
            content: [issue.title, issue.lede, issue.epigraph?.text].filter(Boolean).join('. '),
            meta: {
              title: issue.title,
              kind: 'issue',
              issue: longDate(issue.date),
              section: 'Выпуск дня',
              ...(issue.heroImage?.url ? { image: issue.heroImage.url } : {}),
            },
            filters: { section: ['Выпуск дня'], month: [month] },
            sort: { date: sortKey },
          });
          records++;

          for (const s of issue.sections) {
            for (const it of s.items) {
              const era = eraOf(it.year);
              await index.addCustomRecord({
                url: `${issueUrl}#${it.anchor}`,
                language: 'ru',
                content: [it.title, it.dateLabel, it.text, ...it.facts].filter(Boolean).join('. '),
                meta: {
                  title: it.title,
                  kind: 'item',
                  issue: longDate(issue.date),
                  section: s.short,
                  ...(it.dateLabel ? { label: it.dateLabel } : {}),
                  ...(it.image?.url ? { image: it.image.url } : {}),
                },
                filters: { section: [s.short], month: [month], ...(era ? { era: [era.label] } : {}) },
                sort: { date: sortKey },
              });
              records++;
            }
          }
        }

        const out = path.join(fileURLToPath(dir), 'pagefind');
        await index.writeFiles({ outputPath: out });
        await pagefind.close();
        logger.info(`Поисковый индекс: ${records} записей из ${issues.length} выпусков`);
      },
    },
  };
}
