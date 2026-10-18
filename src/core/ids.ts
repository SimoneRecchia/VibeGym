/** Short random id, unique enough for local data. */
export const uid = (prefix = ''): string =>
  `${prefix}${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;

/** Lowercase ascii slug: "Panca piana (bilanciere)" → "panca-piana-bilanciere". */
export const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/** Trend identity of an exercise: catalog id when known, else its name. */
export const exerciseKey = (name: string, catalogId?: string): string =>
  catalogId ? catalogId : `n:${slugify(name)}`;
