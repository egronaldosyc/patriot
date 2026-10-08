// Открытые данные: тот же формат index.json, что пишет сборщик, но собранный из файлов выпусков.
import { allIssues } from '../../lib/issues.js';
import { indexEntry } from '../../lib/normalize.js';

export function GET() {
  const body = { days: allIssues().map(indexEntry) };
  return new Response(JSON.stringify(body, null, 1), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
