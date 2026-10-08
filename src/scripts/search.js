// Поиск по архиву на Pagefind: индекс разбит на фрагменты, грузится только нужное.
// Выдача рисуется через DOM-узлы; из сниппета Pagefind переносится только текст и <mark>.

const PAGE = 20;

function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** Безопасный перенос сниппета: только текстовые узлы и <mark>. */
function excerptNode(html) {
  const out = el('span', 'r__ex');
  const doc = new DOMParser().parseFromString(`<p>${html}</p>`, 'text/html');
  const walk = (node, into) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) into.append(document.createTextNode(child.textContent));
      else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === 'MARK') {
          const m = document.createElement('mark');
          m.textContent = child.textContent;
          into.append(m);
        } else walk(child, into);
      }
    }
  };
  walk(doc.body.firstChild, out);
  return out;
}

function safeHttp(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null;
}

export async function initSearch() {
  const root = document.querySelector('[data-search]');
  if (!root) return;
  const base = root.dataset.base || '/';
  const input = root.querySelector('[data-search-input]');
  const clear = root.querySelector('[data-clear]');
  const status = root.querySelector('[data-status]');
  const results = root.querySelector('[data-results]');
  const more = root.querySelector('[data-more]');
  const hints = root.querySelector('[data-hints]');
  const groups = [...root.querySelectorAll('[data-filter]')];
  const form = root.querySelector('form');

  const state = { q: '', section: null, era: null };
  const params = new URLSearchParams(location.search);
  state.q = params.get('q') ?? '';
  state.section = params.get('section');
  state.era = params.get('era');
  input.value = state.q;

  let pf;
  try {
    pf = await import(/* @vite-ignore */ `${base}pagefind/pagefind.js`);
    await pf.options({ excerptLength: 28 });
    pf.init();
  } catch {
    status.textContent = 'Поиск работает в собранной версии сайта';
    return;
  }

  let token = 0;
  let pending = [];

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.section) p.set('section', state.section);
    if (state.era) p.set('era', state.era);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  function syncChips(counts) {
    for (const g of groups) {
      const key = g.dataset.filter;
      for (const chip of g.querySelectorAll('.chip')) {
        const v = chip.dataset.value;
        chip.setAttribute('aria-pressed', String(state[key] === v));
        const c = counts?.[key]?.[v];
        const slot = chip.querySelector('[data-count]');
        if (slot) slot.textContent = c ? String(c) : '';
        if (counts && !c && state[key] !== v) chip.dataset.empty = '';
        else delete chip.dataset.empty;
      }
    }
  }

  function renderResult(data) {
    const li = document.createElement('li');
    const a = el('a', 'r');
    a.href = data.url;
    const body = el('span', 'r__body');
    const meta = el('span', 'r__meta label');
    if (data.meta?.section) meta.append(el('span', 'r__sec', data.meta.section));
    if (data.meta?.issue) meta.append(el('span', null, `Выпуск от ${data.meta.issue.replace(/ года$/, '')}`));
    if (data.meta?.label) meta.append(el('span', null, data.meta.label));
    body.append(meta, el('span', 'r__title', data.meta?.title ?? 'Без заголовка'));
    if (data.excerpt) body.append(excerptNode(data.excerpt));
    a.append(body);
    const img = safeHttp(data.meta?.image);
    if (img) {
      a.classList.add('has-media');
      const media = el('span', 'r__media');
      media.dataset.media = '';
      const im = document.createElement('img');
      im.src = img;
      im.alt = '';
      im.loading = 'lazy';
      im.decoding = 'async';
      im.referrerPolicy = 'no-referrer';
      im.setAttribute('data-hide-on-error', '');
      media.append(im);
      a.append(media);
    }
    li.append(a);
    return li;
  }

  async function renderMore() {
    const batch = pending.splice(0, PAGE);
    const my = token;
    const data = await Promise.all(batch.map((r) => r.data()));
    if (my !== token) return;
    const frag = document.createDocumentFragment();
    data.forEach((d) => frag.append(renderResult(d)));
    results.append(frag);
    more.hidden = pending.length === 0;
  }

  async function run() {
    const my = ++token;
    syncUrl();
    clear.hidden = !state.q;
    const filters = {};
    if (state.section) filters.section = state.section;
    if (state.era) filters.era = state.era;
    const hasQuery = state.q.trim().length > 0;
    const hasFilter = Object.keys(filters).length > 0;
    hints.hidden = hasQuery || hasFilter;

    if (!hasQuery && !hasFilter) {
      results.textContent = '';
      more.hidden = true;
      status.textContent = '';
      syncChips(await pf.filters());
      return;
    }

    status.textContent = 'Ищем…';
    const res = await pf.search(hasQuery ? state.q : null, {
      filters,
      ...(hasQuery ? {} : { sort: { date: 'desc' } }),
    });
    if (my !== token || !res) return;

    // Счётчики группы считаются без её собственного фильтра — видно, где ещё есть результаты.
    const counts = { ...res.filters };
    for (const key of Object.keys(filters)) {
      const rest = { ...filters };
      delete rest[key];
      const alt = await pf.search(hasQuery ? state.q : null, { filters: rest });
      if (my !== token) return;
      counts[key] = alt?.filters?.[key] ?? counts[key];
    }

    results.textContent = '';
    pending = [...res.results];
    const n = res.results.length;
    status.textContent = n
      ? `Найдено: ${n} ${plural(n, 'запись', 'записи', 'записей')}`
      : 'Ничего не найдено. Попробуйте другое слово или снимите фильтр.';
    syncChips(counts);
    await renderMore();
  }

  let timer;
  input.addEventListener('input', () => {
    state.q = input.value;
    clearTimeout(timer);
    timer = setTimeout(run, 160);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(timer);
    state.q = input.value;
    run();
  });
  clear.addEventListener('click', () => {
    input.value = '';
    state.q = '';
    input.focus();
    run();
  });
  for (const g of groups) {
    g.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const key = g.dataset.filter;
      state[key] = state[key] === chip.dataset.value ? null : chip.dataset.value;
      run();
    });
  }
  hints.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hint]');
    if (!b) return;
    input.value = b.dataset.hint;
    state.q = b.dataset.hint;
    run();
  });
  more.addEventListener('click', renderMore);

  if (!state.q) input.focus({ preventScroll: true });
  run();
}
