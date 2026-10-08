import { iconPng } from '../../lib/og.js';

const SIZES = [32, 180, 192, 512];

export function getStaticPaths() {
  return SIZES.map((s) => ({ params: { size: String(s) } }));
}

export async function GET({ params }) {
  return new Response(await iconPng(Number(params.size)), { headers: { 'Content-Type': 'image/png' } });
}
