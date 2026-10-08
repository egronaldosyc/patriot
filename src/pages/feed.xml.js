import rss from '@astrojs/rss';
import { allIssues, siteToday } from '../lib/issues.js';
import { dayMonth, issueInstant, count } from '../lib/dates.js';
import { href } from '../lib/paths.js';

export function GET(context) {
  const today = siteToday();
  // В ленту — только вышедшие выпуски: подготовленные заранее появятся в свой день.
  const issues = allIssues()
    .filter((i) => i.date <= today)
    .slice(0, 60);
  return rss({
    title: 'Патриот — военно-историческая летопись',
    description: 'Ежедневный выпуск: памятные даты, Великая Отечественная, армия и флот, герои, арсенал.',
    site: new URL(href(''), context.site),
    trailingSlash: true,
    items: issues.map((i) => ({
      title: `${dayMonth(i.date)}: ${i.title}`,
      link: href(`${i.date}/`),
      pubDate: issueInstant(i.date),
      description: [i.lede, `В выпуске ${count(i.stats.items, 'материал', 'материала', 'материалов')}.`].filter(Boolean).join(' '),
      categories: i.sections.filter((s) => s.items.length).map((s) => s.short),
    })),
    customData: '<language>ru</language>',
  });
}
