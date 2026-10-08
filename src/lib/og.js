// Карточки для превью ссылок (Telegram, ВКонтакте, мессенджеры): 1200×630 PNG на этапе сборки.
// Только типографика бренда — без сторонних фото, поэтому нет вопросов с правами и хотлинком.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);

// Fontsource делит шрифты на подмножества: кириллица и латиница (цифры, пробел, пунктуация) — отдельные файлы.
const OSWALD = 'Oswald, OswaldL';
const NARROW = 'Narrow, NarrowL';
const SERIF = 'Serif, SerifL';

const C = {
  ink: '#0d0f12',
  paper: '#14171c',
  rule: '#272d36',
  text: '#f3efe6',
  muted: '#99a1ac',
  brass: '#bd9a52',
  brassGhost: '#221d14',
  carmine: '#9a2f28',
};

let fontsPromise;
function fonts() {
  fontsPromise ??= Promise.all(
    [
      ['Oswald', 600, 'normal', '@fontsource/oswald/files/oswald-cyrillic-600-normal.woff'],
      ['OswaldL', 600, 'normal', '@fontsource/oswald/files/oswald-latin-600-normal.woff'],
      ['Oswald', 400, 'normal', '@fontsource/oswald/files/oswald-cyrillic-400-normal.woff'],
      ['OswaldL', 400, 'normal', '@fontsource/oswald/files/oswald-latin-400-normal.woff'],
      ['Narrow', 700, 'normal', '@fontsource/pt-sans-narrow/files/pt-sans-narrow-cyrillic-700-normal.woff'],
      ['NarrowL', 700, 'normal', '@fontsource/pt-sans-narrow/files/pt-sans-narrow-latin-700-normal.woff'],
      ['Serif', 400, 'italic', '@fontsource/pt-serif/files/pt-serif-cyrillic-400-italic.woff'],
      ['SerifL', 400, 'italic', '@fontsource/pt-serif/files/pt-serif-latin-400-italic.woff'],
    ].map(async ([name, weight, style, spec]) => ({ name, weight, style, data: await readFile(require.resolve(spec)) })),
  );
  return fontsPromise;
}

/** Минимальный конструктор узлов для satori (без JSX). */
function h(type, style, ...children) {
  const flat = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return { type, props: { style: { display: 'flex', ...style }, children: flat.length === 1 ? flat[0] : flat } };
}

function titleSize(t) {
  const n = t.length;
  if (n <= 24) return 92;
  if (n <= 38) return 78;
  if (n <= 52) return 66;
  return 56;
}

function frame(children) {
  return h(
    'div',
    { width: 1200, height: 630, flexDirection: 'column', backgroundColor: C.ink, color: C.text, padding: '56px 72px 52px', position: 'relative' },
    children,
  );
}

function masthead() {
  return h(
    'div',
    { flexDirection: 'column', width: '100%' },
    h(
      'div',
      { alignItems: 'center', justifyContent: 'space-between', width: '100%' },
      h(
        'div',
        { alignItems: 'center' },
        h('div', { width: 14, height: 30, borderLeft: `5px solid ${C.carmine}`, borderRight: `5px solid ${C.brass}`, marginRight: 18 }),
        h('div', { fontFamily: OSWALD, fontWeight: 600, fontSize: 34, letterSpacing: 7.5, textTransform: 'uppercase' }, 'Патриот'),
      ),
      h('div', { fontFamily: NARROW, fontWeight: 700, fontSize: 19, letterSpacing: 4.5, color: C.brass, textTransform: 'uppercase', whiteSpace: 'nowrap' }, 'Военно-историческая летопись'),
    ),
    h('div', { width: '100%', height: 4, backgroundColor: C.carmine, marginTop: 26 }),
    h('div', { width: '100%', height: 1, backgroundColor: C.rule, marginTop: 4 }),
  );
}

async function render(node) {
  const svg = await satori(node, { width: 1200, height: 630, fonts: await fonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } }).render().asPng();
}

export async function issueCard({ day, year, kicker, title, stats, weekday }) {
  return render(
    frame([
      h(
        'div',
        {
          position: 'absolute',
          right: 40,
          bottom: -70,
          fontFamily: OSWALD,
          fontWeight: 600,
          fontSize: 560,
          lineHeight: 1,
          color: C.brassGhost,
          letterSpacing: -20,
        },
        String(day),
      ),
      masthead(),
      h(
        'div',
        { flexDirection: 'column', flexGrow: 1, justifyContent: 'center', maxWidth: 1000 },
        h('div', { fontFamily: NARROW, fontWeight: 700, fontSize: 26, letterSpacing: 6, color: C.brass, textTransform: 'uppercase' }, kicker),
        h(
          'div',
          {
            marginTop: 18,
            fontFamily: OSWALD,
            fontWeight: 600,
            fontSize: titleSize(title),
            lineHeight: 1.02,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: C.text,
          },
          title,
        ),
      ),
      h(
        'div',
        { justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: `1px solid ${C.rule}`, paddingTop: 20 },
        h('div', { fontFamily: NARROW, fontWeight: 700, fontSize: 21, letterSpacing: 3, color: C.muted, textTransform: 'uppercase', whiteSpace: 'nowrap' }, stats),
        h('div', { fontFamily: NARROW, fontWeight: 700, fontSize: 21, letterSpacing: 3, color: C.muted, textTransform: 'uppercase', whiteSpace: 'nowrap' }, [weekday, year].filter(Boolean).join(' · ')),
      ),
    ]),
  );
}

export async function defaultCard() {
  return render(
    frame([
      masthead(),
      h(
        'div',
        { flexDirection: 'column', flexGrow: 1, justifyContent: 'center' },
        h('div', { fontFamily: OSWALD, fontWeight: 600, fontSize: 168, lineHeight: 0.95, letterSpacing: 18, textTransform: 'uppercase' }, 'Патриот'),
        h(
          'div',
          { marginTop: 28, fontFamily: SERIF, fontStyle: 'italic', fontSize: 34, lineHeight: 1.4, color: C.muted, maxWidth: 900 },
          'Ежедневная военно-историческая летопись: памятные даты, Великая Отечественная, армия и флот, герои.',
        ),
      ),
      h('div', { width: 120, height: 4, backgroundColor: C.brass }),
    ]),
  );
}

export async function iconPng(size) {
  const pad = Math.round(size * 0.22);
  const bar = Math.max(2, Math.round(size * 0.1));
  const node = h(
    'div',
    { width: size, height: size, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
    h(
      'div',
      { width: size - pad * 2, height: size - pad * 2, flexDirection: 'column', justifyContent: 'space-between' },
      h('div', { width: '100%', height: bar, backgroundColor: C.brass }),
      h(
        'div',
        { flexGrow: 1, justifyContent: 'space-between' },
        h('div', { width: bar, height: '100%', backgroundColor: C.brass }),
        h('div', { width: bar, height: '100%', backgroundColor: C.brass }),
      ),
      h('div', { width: '100%', height: Math.max(2, Math.round(bar * 0.6)), backgroundColor: C.carmine, marginTop: Math.round(bar * 0.8) }),
    ),
  );
  const svg = await satori(node, { width: size, height: size, fonts: await fonts() });
  return new Resvg(svg).render().asPng();
}
