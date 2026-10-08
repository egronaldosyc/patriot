// Нормализация выпусков «Патриота».
// Контракт задаёт сборщик (рутина), любое поле может быть null или отсутствовать.
// Модуль на чистом JS: его используют и страницы Astro, и интеграция поиска, и скрипт проверки.

export const SECTION_ORDER = ['dates', 'vov', 'army', 'security', 'heroes', 'svo', 'weapons', 'word'];

export const SECTION_META = {
  dates: {
    title: 'Календарь памятных дат',
    short: 'Памятные даты',
    about: 'Дни воинской славы и памятные даты России, профессиональные праздники родов войск и служб, даты воинской традиции.',
  },
  vov: {
    title: 'Великая Отечественная: этот день',
    short: 'Великая Отечественная',
    about: 'События 1941–1945 годов, пришедшиеся на дату: операции, освобождённые города, приказы Ставки, сводки Совинформбюро, салюты Москвы.',
  },
  army: {
    title: 'Летопись армии и флота',
    short: 'Армия и флот',
    about: 'История вооружённых сил от допетровской эпохи до наших дней: сражения и походы, соединения и училища, уставы и реформы, первые полёты и спуски кораблей.',
  },
  security: {
    title: 'Щит державы',
    short: 'Щит державы',
    about: 'Органы безопасности и правопорядка: ВЧК — КГБ — ФСБ, милиция и полиция, пограничники, внутренние войска и Росгвардия, разведка, МЧС.',
  },
  heroes: {
    title: 'Герои',
    short: 'Герои',
    about: 'Герои Советского Союза и России, полные кавалеры ордена Славы, георгиевские кавалеры — родившиеся, совершившие подвиг или погибшие в этот день.',
  },
  svo: {
    title: 'Специальная военная операция: хроника даты',
    short: 'СВО',
    about: 'События специальной военной операции, пришедшиеся на дату в прошлые годы, — с указанием, кто о них сообщает.',
  },
  weapons: {
    title: 'Арсенал',
    short: 'Арсенал',
    about: 'Образцы вооружения и техники: принятие на вооружение, первые пуски и полёты, юбилеи конструкторов, оружие Победы и современные системы.',
  },
  word: {
    title: 'Слово патриота',
    short: 'Слово патриота',
    about: 'Строки приказов и уставов, слова военачальников, песни и стихи военных лет — с точной атрибуцией.',
  },
};

export const ERAS = [
  { id: 'old', label: 'До XIX века', from: -Infinity, to: 1800 },
  { id: 'xix', label: 'XIX век — 1917', from: 1801, to: 1917 },
  { id: 'interwar', label: '1918–1940', from: 1918, to: 1940 },
  { id: 'ww2', label: '1941–1945', from: 1941, to: 1945 },
  { id: 'ussr', label: '1946–1991', from: 1946, to: 1991 },
  { id: 'modern', label: 'С 1992 года', from: 1992, to: Infinity },
];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function str(v) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\r\n?/g, '\n').trim();
  return s.length ? s : null;
}

export function safeUrl(v) {
  const s = str(v);
  if (!s || !/^https?:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

export function isIsoDate(v) {
  const m = DATE_RE.exec(String(v ?? ''));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function strList(v) {
  return Array.isArray(v) ? v.map(str).filter(Boolean) : [];
}

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function normImage(v) {
  if (!v || typeof v !== 'object') return null;
  const img = {
    url: safeUrl(v.url),
    pageUrl: safeUrl(v.page_url),
    caption: str(v.caption),
    author: str(v.author),
    license: str(v.license),
  };
  if (!img.url && !img.pageUrl) return null;
  return img;
}

/** Год события из метки даты: «24 сентября 1944 года», «1799 год», «13 (25) сентября 1854 года». */
export function eventYear(label, fallbackText) {
  for (const src of [label, fallbackText]) {
    if (!src) continue;
    const m = /(?<!\d)(1[0-9]{3}|20[0-9]{2})(?!\d)/.exec(src);
    if (m) return +m[1];
  }
  return null;
}

export function eraOf(year) {
  if (year == null) return null;
  return ERAS.find((e) => year >= e.from && year <= e.to) ?? null;
}

function normItem(v, sectionId, index) {
  if (!v || typeof v !== 'object') return null;
  const title = str(v.title);
  const text = str(v.text);
  if (!title && !text) return null;
  const dateLabel = str(v.date_label);
  const year = eventYear(dateLabel, title);
  const url = safeUrl(v.url);
  return {
    anchor: `m-${sectionId}-${index + 1}`,
    sectionId,
    title: title ?? 'Без заголовка',
    dateLabel,
    year,
    era: eraOf(year)?.id ?? null,
    text,
    facts: strList(v.facts),
    note: str(v.note),
    url,
    sourceName: str(v.source_name) ?? (url ? hostOf(url) : null),
    image: normImage(v.image),
  };
}

function normSection(v) {
  if (!v || typeof v !== 'object') return null;
  const id = str(v.id);
  if (!id) return null;
  const items = (Array.isArray(v.items) ? v.items : [])
    .map((it, i) => normItem(it, id, i))
    .filter(Boolean);
  return {
    id,
    title: str(v.title) ?? SECTION_META[id]?.title ?? id,
    short: SECTION_META[id]?.short ?? str(v.title) ?? id,
    subtitle: str(v.subtitle),
    emptyNote: str(v.empty_note),
    items,
  };
}

function normPost(v, i) {
  if (!v || typeof v !== 'object') return null;
  const text = str(v.text);
  const title = str(v.title);
  if (!text && !title) return null;
  return {
    anchor: `post-${i + 1}`,
    title: title ?? `Пост ${i + 1}`,
    text: text ?? '',
    hashtags: strList(v.hashtags).map((h) => (h.startsWith('#') ? h : `#${h}`)),
    image: normImage(v.image),
    sourceUrl: safeUrl(v.source_url),
  };
}

/**
 * Приводит сырой выпуск к безопасной форме. Возвращает { issue } или { error }.
 * @param {unknown} raw
 * @param {string} [fileDate] дата из имени файла, если известна
 */
export function normalizeIssue(raw, fileDate) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'файл не содержит объект выпуска' };
  const date = isIsoDate(raw.date) ? raw.date : isIsoDate(fileDate) ? fileDate : null;
  if (!date) return { error: 'нет корректного поля date' };

  const byId = new Map();
  for (const s of Array.isArray(raw.sections) ? raw.sections : []) {
    const n = normSection(s);
    if (n && !byId.has(n.id)) byId.set(n.id, n);
  }
  // Порядок разделов фиксирован контрактом; неизвестные разделы идут следом, ничего не теряем.
  const sections = [
    ...SECTION_ORDER.filter((id) => byId.has(id)).map((id) => byId.get(id)),
    ...[...byId.values()].filter((s) => !SECTION_ORDER.includes(s.id)),
  ];

  const ep = raw.epigraph && typeof raw.epigraph === 'object' ? raw.epigraph : null;
  const epigraph = ep && str(ep.text) ? { text: str(ep.text), author: str(ep.author), sourceUrl: safeUrl(ep.source_url) } : null;

  const posts = (Array.isArray(raw.posts) ? raw.posts : []).map(normPost).filter(Boolean);

  const credits = [];
  const seen = new Set();
  for (const c of Array.isArray(raw.image_credits) ? raw.image_credits : []) {
    const img = normImage(c);
    if (!img) continue;
    const key = img.pageUrl ?? img.url;
    if (seen.has(key)) continue;
    seen.add(key);
    credits.push(img);
  }

  const items = sections.flatMap((s) => s.items);
  const heroImage = normImage(raw.hero_image);
  const photoUrls = new Set(
    [heroImage, ...items.map((i) => i.image), ...posts.map((p) => p.image)].filter((i) => i?.url).map((i) => i.url),
  );

  const issue = {
    date,
    generatedAt: str(raw.generated_at),
    dayMonth: str(raw.day_month),
    weekday: str(raw.weekday),
    title: str(raw.title) ?? 'Выпуск дня',
    lede: str(raw.lede),
    epigraph,
    heroImage,
    photoNote: str(raw.photo_note),
    sections,
    posts,
    credits,
    stats: { items: items.length, posts: posts.length, photos: photoUrls.size },
  };
  return { issue };
}

/** Запись для data/index.json — тот же формат, что пишет сборщик. */
export function indexEntry(issue) {
  return {
    date: issue.date,
    title: issue.title,
    lede: issue.lede,
    count: issue.stats.items,
    posts: issue.stats.posts,
    photos: issue.stats.photos,
  };
}
