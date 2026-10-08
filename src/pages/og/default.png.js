import { defaultCard } from '../../lib/og.js';

export async function GET() {
  return new Response(await defaultCard(), { headers: { 'Content-Type': 'image/png' } });
}
