// Клиентская часть: тема, копирование, «Поделиться», окна историй, карусель, лента дат, клавиатура.
// Весь текст выводится только через textContent.

const root = document.documentElement;
const THEME_KEY = 'patriot-theme';

/* ---------- Уведомления (живой регион) ---------- */

let toastEl;
let toastTimer;
function toast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.append(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
}

/* ---------- Тема ---------- */

const mql = window.matchMedia('(prefers-color-scheme: light)');

function storedTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

function applyTheme() {
  const chosen = storedTheme();
  const resolved = chosen ?? (mql.matches ? 'light' : 'dark');
  if (chosen) root.dataset.theme = chosen;
  else delete root.dataset.theme;
  root.dataset.themeResolved = resolved;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', resolved === 'light' ? '#f4f1ea' : '#0d0f12');
  });
  document.querySelectorAll('[data-theme-label]').forEach((el) => {
    el.textContent = resolved === 'light' ? 'Тёмная тема' : 'Светлая тема';
  });
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-label', resolved === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему');
  });
}

function toggleTheme() {
  const next = root.dataset.themeResolved === 'light' ? 'dark' : 'light';
  try {
    // Совпало с системной — снимаем ручной выбор, иначе запоминаем.
    if ((next === 'light') === mql.matches) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, next);
  } catch {
    root.dataset.theme = next;
  }
  const run = () => applyTheme();
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(run);
  } else run();
}

applyTheme();
mql.addEventListener?.('change', applyTheme);
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-theme-toggle]')) toggleTheme();
});

/* ---------- Копирование ---------- */

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* пробуем запасной способ */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '-9999px';
  document.body.append(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

function flash(btn, doneText) {
  const label = btn.querySelector('span') ?? null;
  const original = btn.dataset.copyLabel;
  btn.dataset.state = 'done';
  if (label && doneText) label.textContent = doneText;
  setTimeout(() => {
    delete btn.dataset.state;
    if (label && original) label.textContent = original;
  }, 2000);
}

function pageUrl(hash = '') {
  return location.origin + location.pathname + hash;
}

document.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) {
    const ok = await copyText(copyBtn.dataset.copy);
    if (ok) {
      flash(copyBtn, 'Скопировано');
      toast('Текст скопирован');
    } else toast('Не удалось скопировать — выделите текст вручную');
    return;
  }
  const linkBtn = e.target.closest('[data-copy-link]');
  if (linkBtn) {
    const hash = linkBtn.dataset.copyLink;
    const ok = await copyText(pageUrl(hash));
    if (ok) {
      flash(linkBtn);
      toast('Ссылка на материал скопирована');
      history.replaceState(null, '', hash);
    } else toast('Не удалось скопировать ссылку');
  }
});

/* ---------- Поделиться ---------- */

let shareDialog;
function shareSheet({ title, url }) {
  if (!shareDialog) {
    shareDialog = document.createElement('dialog');
    shareDialog.className = 'share-sheet';
    shareDialog.setAttribute('aria-label', 'Поделиться');
    const head = document.createElement('p');
    head.className = 'kicker';
    head.textContent = 'Поделиться';
    const name = document.createElement('p');
    name.className = 'share-sheet__title';
    const list = document.createElement('div');
    list.className = 'share-sheet__list';
    const mk = (tag, text) => {
      const el = document.createElement(tag);
      el.className = 'btn btn--quiet';
      el.textContent = text;
      return el;
    };
    const tg = mk('a', 'Telegram');
    const vk = mk('a', 'ВКонтакте');
    for (const a of [tg, vk]) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    const cp = mk('button', 'Скопировать ссылку');
    cp.type = 'button';
    const close = mk('button', 'Закрыть');
    close.type = 'button';
    close.addEventListener('click', () => shareDialog.close());
    list.append(tg, vk, cp, close);
    shareDialog.append(head, name, list);
    shareDialog.addEventListener('click', (ev) => {
      if (ev.target === shareDialog) shareDialog.close();
    });
    shareDialog._set = (t, u) => {
      name.textContent = t;
      tg.href = `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`;
      vk.href = `https://vk.com/share.php?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`;
      cp.onclick = async () => {
        const ok = await copyText(u);
        toast(ok ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку');
        if (ok) shareDialog.close();
      };
    };
    document.body.append(shareDialog);
  }
  shareDialog._set(title, url);
  shareDialog.showModal();
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-share]');
  if (!btn) return;
  const data = {
    title: btn.dataset.shareTitle || document.title,
    text: btn.dataset.shareText || undefined,
    url: btn.dataset.shareUrl || location.href,
  };
  if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share(data);
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  shareSheet(data);
});

/* ---------- Окна историй ---------- */

function openDialog(id, { push = true } = {}) {
  const dlg = document.getElementById(id);
  if (!dlg || dlg.open) return;
  dlg.showModal();
  if (push) history.replaceState(null, '', `#${id.replace(/^dlg-/, '')}`);
}

document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-dialog-open]');
  if (opener) {
    openDialog(opener.dataset.dialogOpen);
    return;
  }
  const closer = e.target.closest('[data-dialog-close]');
  if (closer) closer.closest('dialog')?.close();
});

document.querySelectorAll('dialog.dlg').forEach((dlg) => {
  // Клик по подложке закрывает окно.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('close', () => {
    if (location.hash === `#${dlg.id.replace(/^dlg-/, '')}`) history.replaceState(null, '', location.pathname);
    const opener = document.querySelector(`[data-dialog-open="${dlg.id}"]`);
    opener?.focus({ preventScroll: true });
  });
});

if (/^#post-\d+$/.test(location.hash)) {
  const id = `dlg-${location.hash.slice(1)}`;
  if (document.getElementById(id)) {
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' });
    openDialog(id, { push: false });
  }
}

/* ---------- Карусель ---------- */

document.querySelectorAll('[data-carousel]').forEach((track) => {
  const section = track.closest('section');
  const prev = section?.querySelector('[data-carousel-prev]');
  const next = section?.querySelector('[data-carousel-next]');
  const step = () => Math.max(track.clientWidth * 0.8, 280);
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max;
  };
  prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
});

/* ---------- Лента дат: текущий день в центре ---------- */

document.querySelectorAll('[data-ribbon]').forEach((list) => {
  const active = list.querySelector('[aria-current="page"]');
  if (!active) return;
  const item = active.parentElement;
  list.scrollLeft = item.offsetLeft - list.clientWidth / 2 + item.clientWidth / 2;
});

/* ---------- Клавиатура ---------- */

function typing(target) {
  return target.closest?.('input, textarea, select, [contenteditable="true"]');
}

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
  if (document.querySelector('dialog[open], [popover]:popover-open')) return;
  if (e.key === '/') {
    const input = document.querySelector('[data-search-input]');
    if (input) input.focus();
    else {
      const link = document.querySelector('[data-search-link]');
      if (link) location.href = link.href;
    }
    e.preventDefault();
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (e.target.closest?.('[data-carousel], [data-ribbon], .eras, .tablewrap')) return;
    const link = document.querySelector(`.switcher [data-nav="${e.key === 'ArrowLeft' ? 'older' : 'newer'}"]`);
    if (link) location.href = link.href;
  }
});

/* ---------- Меню: закрыть по переходу ---------- */

document.querySelectorAll('#site-menu a').forEach((a) => {
  a.addEventListener('click', () => document.getElementById('site-menu')?.hidePopover?.());
});
