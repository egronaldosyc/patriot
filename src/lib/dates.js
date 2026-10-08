// Даты и склонения. Всё считается по Москве (Europe/Moscow, UTC+3 без перехода на летнее время).

export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function parts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** Сегодняшняя дата по Москве в формате YYYY-MM-DD. */
export function todayMsk(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(iso, n) {
  const { y, m, d } = parts(iso);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** «9 октября» */
export function dayMonth(iso) {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS_GEN[m - 1]}`;
}

/** «9 октября 2026 года» */
export function longDate(iso) {
  const { y } = parts(iso);
  return `${dayMonth(iso)} ${y} года`;
}

/** «9 окт» */
export function shortDate(iso) {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export function weekdayOf(iso) {
  const { y, m, d } = parts(iso);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Понедельник = 0 … воскресенье = 6 */
export function weekdayIndexMon(iso) {
  const { y, m, d } = parts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** «1 материал / 2 материала / 5 материалов» */
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function count(n, one, few, many) {
  return `${n} ${plural(n, one, few, many)}`;
}

/** «82 года назад» относительно года выпуска. */
export function yearsAgo(eventYear, issueIso) {
  if (eventYear == null) return null;
  const n = parts(issueIso).y - eventYear;
  if (n <= 0) return null;
  return `${n} ${plural(n, 'год', 'года', 'лет')} назад`;
}

/** Время сборки по Москве: «8 октября, 06:28» */
export function mskStamp(isoDateTime) {
  if (!isoDateTime) return null;
  const t = new Date(isoDateTime);
  if (Number.isNaN(t.getTime())) return null;
  const f = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return f.format(t);
}

/** Момент публикации выпуска для RSS и метаданных: полночь даты выпуска по Москве. */
export function issueInstant(iso) {
  return new Date(`${iso}T00:00:00+03:00`);
}
