// Открытые данные: исходный выпуск в контракте сборщика.
import { allIssues, getRawIssue } from '../../lib/issues.js';

export function getStaticPaths() {
  return allIssues().map((i) => ({ params: { date: i.date } }));
}

export function GET({ params }) {
  const raw = getRawIssue(params.date);
  return new Response(JSON.stringify(raw ?? {}, null, 1), {
    status: raw ? 200 : 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
