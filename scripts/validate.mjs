#!/usr/bin/env node
// Проверка выпусков в data/ перед сборкой.
// Битый файл не останавливает публикацию остальных: он помечается в отчёте GitHub Actions и пропускается сайтом.
// Код выхода 1 — только если не осталось ни одного годного выпуска.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeIssue, SECTION_ORDER } from '../src/lib/normalize.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, process.argv[2] ?? 'data');
const gha = Boolean(process.env.GITHUB_ACTIONS);
const counts = { error: 0, warning: 0, notice: 0 };

function report(level, file, msg) {
  counts[level]++;
  if (gha) console.log(`::${level} file=${path.relative(root, file).replaceAll('\\', '/')}::${msg}`);
  else console.log(`${level.toUpperCase().padEnd(7)} ${path.basename(file)}: ${msg}`);
}

function walkStrings(v, fn, at = '') {
  if (typeof v === 'string') fn(v, at);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, fn, `${at}[${i}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkStrings(x, fn, at ? `${at}.${k}` : k);
}

const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
let good = 0;

for (const name of names) {
  const file = path.join(dir, name);
  if (name === 'index.json') {
    report('notice', file, 'index.json собирается сайтом из файлов выпусков, этот файл не используется');
    continue;
  }
  const m = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(name);
  if (!m) {
    report('warning', file, 'имя файла не в формате YYYY-MM-DD.json — пропущен');
    continue;
  }
  let raw;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    report('error', file, `JSON не читается: ${e.message}`);
    continue;
  }
  const { issue, error } = normalizeIssue(raw, m[1]);
  if (error) {
    report('error', file, error);
    continue;
  }
  good++;
  if (raw.date !== m[1]) report('warning', file, `поле date (${raw.date}) не совпадает с именем файла`);

  const ids = Array.isArray(raw.sections) ? raw.sections.map((s) => s?.id) : [];
  const missing = SECTION_ORDER.filter((id) => !ids.includes(id));
  if (missing.length) report('notice', file, `нет разделов: ${missing.join(', ')}`);
  const known = ids.filter((id) => SECTION_ORDER.includes(id));
  if (known.join() !== SECTION_ORDER.filter((id) => known.includes(id)).join()) {
    report('notice', file, 'разделы идут не по порядку — сайт расставит их сам');
  }
  for (const s of raw.sections ?? []) {
    if (s && Array.isArray(s.items) && s.items.length === 0 && !s.empty_note) {
      report('notice', file, `раздел ${s.id} пуст и без empty_note`);
    }
  }

  walkStrings(raw, (str, at) => {
    if (/политрук/i.test(str)) report('warning', file, `«Политрук» в поле ${at}: проект называется «Патриот»`);
    if (/(^|\.)(url|page_url|source_url)$/.test(at) && str && !/^https?:\/\//i.test(str)) {
      report('warning', file, `ссылка не http/https в поле ${at} — на сайте не выводится`);
    }
  });

  if (!issue.stats.photos && !issue.photoNote) report('notice', file, 'в выпуске нет фотографий и нет photo_note');
}

console.log(
  `\nВыпусков: ${good} из ${names.filter((n) => n !== 'index.json').length}. Ошибок: ${counts.error}, предупреждений: ${counts.warning}, заметок: ${counts.notice}.`,
);
if (good === 0) process.exit(1);
