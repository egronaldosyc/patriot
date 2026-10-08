// Внутренние адреса с учётом base (GitHub Pages отдаёт сайт из /patriot/).

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

/** href('2026-10-09/') → '/patriot/2026-10-09/' */
export function href(path = '') {
  return BASE + String(path).replace(/^\/+/, '');
}

export function issueHref(date, anchor) {
  return href(`${date}/`) + (anchor ? `#${anchor}` : '');
}

export function sectionHref(id, page = 1) {
  return href(page > 1 ? `razdel/${id}/${page}/` : `razdel/${id}/`);
}

/** Абсолютный адрес для метаданных и RSS. */
export function absolute(path, site) {
  return new URL(href(path), site).href;
}
