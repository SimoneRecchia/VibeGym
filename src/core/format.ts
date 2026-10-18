/**
 * Italian formatting helpers. Done by hand (not Intl) because Hermes' Intl
 * support for it-IT with options is inconsistent across devices.
 */

const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];
const MONTHS_SHORT = [
  'gen',
  'feb',
  'mar',
  'apr',
  'mag',
  'giu',
  'lug',
  'ago',
  'set',
  'ott',
  'nov',
  'dic',
];
const WEEKDAYS = [
  'domenica',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
];
export const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
export const WEEKDAYS_NARROW = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

/** Number with Italian decimal comma, trimming trailing zeros. */
export const fmtNum = (n: number, maxDecimals = 1): string => {
  if (!Number.isFinite(n)) return '–';
  const f = Math.pow(10, maxDecimals);
  const r = Math.round(n * f) / f;
  const [int, dec] = String(Math.abs(r)).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${r < 0 ? '−' : ''}${grouped}${dec ? `,${dec}` : ''}`;
};

/** Signed number: "+1,5", "−0,4", "0". */
export const fmtSigned = (n: number, maxDecimals = 1): string => {
  const s = fmtNum(n, maxDecimals);
  return n > 0 && s !== '0' ? `+${s}` : s;
};

export const fmtPct = (n: number, maxDecimals = 0): string =>
  `${fmtNum(n, maxDecimals)}%`;

/** 75 → "1:15", 3725 → "1:02:05". */
export const fmtClock = (totalSec: number): string => {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`;
};

/** 45 → "45 s", 90 → "1:30 min", 600 → "10 min". */
export const fmtDuration = (sec: number): string => {
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  if (s % 60 === 0) {
    const m = s / 60;
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h} h ${rm} min` : `${h} h`;
  }
  return `${fmtClock(s)} min`;
};

/** Rough minutes: "~55 min", "1 h 10 min". */
export const fmtMinutes = (min: number): string => {
  const m = Math.max(1, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};

const toDate = (d: Date | string | number): Date =>
  d instanceof Date ? d : new Date(d);

/** "18 ottobre" / "18 ottobre 2025" (year shown when not current). */
export const fmtDate = (
  d: Date | string | number,
  opts?: { year?: boolean },
): string => {
  const date = toDate(d);
  const showYear =
    opts?.year ?? date.getFullYear() !== new Date().getFullYear();
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${
    showYear ? ` ${date.getFullYear()}` : ''
  }`;
};

/** "18 ott" */
export const fmtDateShort = (d: Date | string | number): string => {
  const date = toDate(d);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
};

export const fmtMonthShort = (d: Date | string | number): string =>
  MONTHS_SHORT[toDate(d).getMonth()];

/** "sabato 18 ottobre" */
export const fmtWeekdayDate = (d: Date | string | number): string => {
  const date = toDate(d);
  return `${WEEKDAYS[date.getDay()]} ${fmtDate(date)}`;
};

export const fmtTime = (d: Date | string | number): string => {
  const date = toDate(d);
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
};

const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "oggi", "ieri", "3 giorni fa", "2 settimane fa", or a date. */
export const fmtRelativeDay = (d: Date | string | number): string => {
  const date = toDate(d);
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86400000,
  );
  if (days <= 0) return 'oggi';
  if (days === 1) return 'ieri';
  if (days < 7) return `${days} giorni fa`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? '1 settimana fa' : `${w} settimane fa`;
  }
  return fmtDate(date);
};

export const greeting = (now = new Date()): string => {
  const h = now.getHours();
  if (h < 5) return 'Buonanotte';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
};

export const capitalize = (s: string): string =>
  s ? s[0].toUpperCase() + s.slice(1) : s;

/** "1 serie" / "3 serie", "1 esercizio" / "4 esercizi". */
export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;
