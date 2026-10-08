import { allIssues } from '../../lib/issues.js';
import { issueCard } from '../../lib/og.js';
import { parts, dayMonth, count, plural } from '../../lib/dates.js';

export function getStaticPaths() {
  return allIssues().map((issue) => ({ params: { date: issue.date }, props: { issue } }));
}

export async function GET({ props }) {
  const { issue } = props;
  const { d, y } = parts(issue.date);
  const live = issue.sections.filter((s) => s.items.length).length;
  const png = await issueCard({
    day: d,
    year: String(y),
    kicker: `Выпуск от ${dayMonth(issue.date)}`,
    title: issue.title,
    stats: `${count(issue.stats.items, 'материал', 'материала', 'материалов')} · ${live} ${plural(live, 'раздел', 'раздела', 'разделов')}`,
    weekday: issue.weekday ?? '',
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
}
