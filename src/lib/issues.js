// Загрузка выпусков на этапе сборки. Источник — data/YYYY-MM-DD.json (пишет сборщик).
// Тестовые выпуски из fixtures/ подключаются только при PATRIOT_FIXTURES=1.

import { normalizeIssue } from './normalize.js';
import { addDays, todayMsk } from './dates.js';

const dataFiles = import.meta.glob('../../data/20*.json', { eager: true, import: 'default' });
const fixtureFiles = import.meta.glob('../../fixtures/20*.json', { eager: true, import: 'default' });

let cache = null;
const rawByDate = new Map();

function load() {
  const sources = { ...dataFiles };
  if (process.env.PATRIOT_FIXTURES === '1') Object.assign(sources, fixtureFiles);

  const byDate = new Map();
  for (const [path, raw] of Object.entries(sources)) {
    const fileDate = path.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1];
    const { issue, error } = normalizeIssue(raw, fileDate);
    if (error) {
      console.warn(`[patriot] пропущен ${path}: ${error}`);
      continue;
    }
    if (fileDate && issue.date !== fileDate) {
      console.warn(`[patriot] ${path}: дата в файле ${issue.date} не совпадает с именем — беру из файла`);
    }
    byDate.set(issue.date, issue);
    rawByDate.set(issue.date, raw);
  }
  // Новые даты первыми, как в index.json сборщика.
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function allIssues() {
  cache ??= load();
  return cache;
}

export function getIssue(date) {
  return allIssues().find((i) => i.date === date) ?? null;
}

/** Исходный объект выпуска в контракте сборщика — для открытых данных. */
export function getRawIssue(date) {
  allIssues();
  return rawByDate.get(date) ?? null;
}

/** «Сегодня» сайта. Переопределяется PATRIOT_TODAY=YYYY-MM-DD для проверок. */
export function siteToday() {
  return process.env.PATRIOT_TODAY || todayMsk();
}

/** Выпуск для главной: самый свежий, чья дата не позже сегодняшней по Москве. */
export function currentIssue() {
  const list = allIssues();
  const today = siteToday();
  return list.find((i) => i.date <= today) ?? list[list.length - 1] ?? null;
}

/** Выпуски, подготовленные заранее (дата позже сегодняшней). */
export function upcomingIssues() {
  const today = siteToday();
  return allIssues()
    .filter((i) => i.date > today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function neighbours(date) {
  const list = allIssues();
  const i = list.findIndex((x) => x.date === date);
  return {
    newer: i > 0 ? list[i - 1] : null,
    older: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
  };
}

export function relativeLabel(date) {
  const today = siteToday();
  if (date === today) return 'Сегодня';
  if (date === addDays(today, 1)) return 'Завтра';
  if (date === addDays(today, -1)) return 'Вчера';
  return null;
}

/** Все материалы архива с привязкой к выпуску — для страниц разделов. */
export function itemsBySection(sectionId) {
  return allIssues().flatMap((issue) =>
    (issue.sections.find((s) => s.id === sectionId)?.items ?? []).map((item) => ({ issue, item })),
  );
}
