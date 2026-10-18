/** Small chart math helpers: nice ticks and monotone curves. */

export const niceStep = (range: number, count: number): number => {
  if (range <= 0) return 1;
  const raw = range / Math.max(1, count);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
};

/** Domain padded to clean tick values. */
export const niceDomain = (
  min: number,
  max: number,
  ticks = 3,
  zeroBased = false,
): { lo: number; hi: number; ticks: number[] } => {
  let lo = zeroBased ? 0 : min;
  let hi = max;
  if (hi === lo) {
    const pad = Math.abs(hi) * 0.05 || 1;
    lo -= pad;
    hi += pad;
  }
  const step = niceStep(hi - lo, ticks);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (zeroBased) lo = Math.max(0, lo);
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step)
    out.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks: out };
};

/** Monotone cubic interpolation (no overshoot) through points → SVG path. */
export const monotonePath = (pts: { x: number; y: number }[]): string => {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  if (n === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push(dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++)
    t.push(
      m[i - 1] * m[i] <= 0
        ? 0
        : (3 * (dx[i - 1] + dx[i])) /
            ((2 * dx[i] + dx[i - 1]) / m[i - 1] +
              (dx[i] + 2 * dx[i - 1]) / m[i]),
    );
  t.push(m[n - 2]);
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i].x + h).toFixed(2)},${(pts[i].y + t[i] * h).toFixed(2)} ${(
      pts[i + 1].x - h
    ).toFixed(2)},${(pts[i + 1].y - t[i + 1] * h).toFixed(2)} ${pts[
      i + 1
    ].x.toFixed(2)},${pts[i + 1].y.toFixed(2)}`;
  }
  return d;
};

/** Compact tick label: 1250 → "1,3k". */
export const compact = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1000)
    return `${(v / 1000)
      .toFixed(a >= 10000 ? 0 : 1)
      .replace('.', ',')
      .replace(',0', '')}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
};
