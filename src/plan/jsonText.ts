/**
 * Lenient JSON extraction for text pasted from an AI chat: strips markdown
 * fences, prose around the object, comments and trailing commas.
 */

const stripComments = (s: string): string => {
  let out = '';
  let inStr = false;
  let quote = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const n = s[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\') {
        out += n ?? '';
        i++;
      } else if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
      out += c;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < s.length && s[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i++;
      continue;
    }
    out += c;
  }
  return out;
};

const stripTrailingCommas = (s: string): string =>
  s.replace(/,(\s*[}\]])/g, '$1');

/** Smart quotes some chat apps substitute. */
const fixQuotes = (s: string): string =>
  s.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'");

export class JsonTextError extends Error {}

/** Lenient parse of an object/array found somewhere in the text. */
const lenientParse = (s: string): unknown => {
  const startObj = s.indexOf('{');
  const startArr = s.indexOf('[');
  const start =
    startObj === -1
      ? startArr
      : startArr === -1
      ? startObj
      : Math.min(startObj, startArr);
  if (start === -1)
    throw new JsonTextError('Non trovo nessun JSON nel testo incollato.');
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  const end = s.lastIndexOf(close);
  if (end <= start)
    throw new JsonTextError(
      'Il JSON sembra incompleto: manca la parentesi di chiusura.',
    );
  return JSON.parse(
    stripTrailingCommas(stripComments(s.slice(start, end + 1))),
  );
};

export const extractJson = (text: string): unknown => {
  let s = text.trim();
  if (!s) throw new JsonTextError('Il testo è vuoto.');
  const fence = s.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // Valid JSON first: typographic quotes inside strings (“Toro”) are fine there.
  try {
    return JSON.parse(s);
  } catch {
    /* fall through to lenient parsing */
  }
  let lastError: unknown;
  // Then tolerate prose, comments and trailing commas; as a last resort,
  // chat apps that turned every " into “ ” are fixed too.
  for (const candidate of [s, fixQuotes(s)]) {
    try {
      return lenientParse(candidate);
    } catch (e) {
      if (e instanceof JsonTextError) throw e;
      lastError = e;
    }
  }
  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new JsonTextError(
    `Il JSON non è valido (${msg}). Chiedi all'AI di rimandarlo completo.`,
  );
};
