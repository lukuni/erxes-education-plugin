import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadModule } from "hunspell-asm";

// Strict Mongolian spelling: the LibreOffice/Hunspell Mongolian dictionary
// (dictionary-mn) running in WebAssembly. It is the source of truth for
// "does this word exist": an AI model may explain or pick a correction, but it
// can never mark a word the dictionary rejects as correct.

interface ISpeller {
  spell(word: string): boolean;
  suggest(word: string): string[];
}

let speller: Promise<ISpeller> | null = null;

export const getSpeller = () => {
  speller ??= (async () => {
    const factory = await loadModule();
    // dictionary-mn is ESM with top-level await; read its files directly.
    const root = dirname(require.resolve("dictionary-mn"));
    const aff = factory.mountBuffer(readFileSync(join(root, "index.aff")), "mn.aff");
    const dic = factory.mountBuffer(readFileSync(join(root, "index.dic")), "mn.dic");
    return factory.create(aff, dic);
  })();
  return speller;
};

export const WORD_RE = /[А-ЯЁӨҮа-яёөү]+(?:-[А-ЯЁӨҮа-яёөү]+)*/g;

export const normalize = (word: string) => word.toLowerCase().replace(/ё/g, "е");

export const levenshtein = (a: string, b: string) => {
  const s = normalize(a);
  const t = normalize(b);
  if (s === t) return 0;
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= t.length; j += 1) {
      cur[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (s[i - 1] === t[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[t.length] ?? Math.max(s.length, t.length);
};

/** 0..1, 1 = identical (case-insensitive). */
export const similarity = (a: string, b: string) => {
  const longest = Math.max(normalize(a).length, normalize(b).length);
  return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
};

export type ErrorType = "Spelling" | "Vowel Harmony" | "Typo" | "None";

const VOWELS = new Set("аэиоуөүеёыяю".split(""));
const BACK = new Set("аоу".split(""));
const FRONT = new Set("эөү".split(""));

/** Classifies how `wrong` differs from `right`. */
export const classify = (wrong: string, right: string): ErrorType => {
  const w = normalize(wrong);
  const r = normalize(right);
  if (w === r) return wrong === right ? "None" : "Spelling"; // capitalisation
  // Same consonant skeleton and the differing letters are back↔front vowels.
  if (w.length === r.length) {
    let vowelSwap = true;
    for (let i = 0; i < w.length; i += 1) {
      const a = w[i] ?? "";
      const b = r[i] ?? "";
      if (a === b) continue;
      const harmony = (BACK.has(a) && FRONT.has(b)) || (FRONT.has(a) && BACK.has(b)) || (a === "о" && b === "ө") || (a === "ө" && b === "о") || (a === "у" && b === "ү") || (a === "ү" && b === "у");
      if (!harmony) vowelSwap = false;
    }
    if (vowelSwap) return "Vowel Harmony";
  }
  // One doubled/dropped/swapped key that is not a vowel-length rule.
  if (levenshtein(w, r) === 1) {
    const longer = w.length > r.length ? w : r;
    const doubled = [...longer].some((ch, i) => ch === longer[i + 1] && !VOWELS.has(ch));
    const trailing = w.length === r.length + 1 && w.startsWith(r);
    if (doubled || trailing) return "Typo";
  }
  return "Spelling";
};

const isVowel = (ch: string | undefined) => !!ch && VOWELS.has(ch);

/**
 * Edit distance tuned for Mongolian misspellings: vowel↔vowel swaps (harmony,
 * ы/и) and dropping a doubled letter are cheaper than other edits, so
 * «байны» → «байна» and «асуудалтайй» → «асуудалтай» win ties.
 */
const weightedDistance = (wrong: string, right: string) => {
  const s = normalize(wrong);
  const t = normalize(right);
  let prev = Array.from({ length: t.length + 1 }, (_, j) => j);
  for (let i = 1; i <= s.length; i += 1) {
    const cur = [i];
    const ch = s[i - 1];
    const doubled = ch === s[i - 2] || ch === s[i];
    for (let j = 1; j <= t.length; j += 1) {
      const other = t[j - 1];
      const sub = ch === other ? 0 : isVowel(ch) && isVowel(other) ? 0.5 : !isVowel(ch) && !isVowel(other) ? 0.8 : 1;
      cur[j] = Math.min(
        (prev[j] ?? 0) + (doubled ? 0.3 : 1), // delete from the misspelling
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + sub,
      );
    }
    prev = cur;
  }
  return prev[t.length] ?? Math.max(s.length, t.length);
};

/** Picks the dictionary suggestion closest to the misspelling (single words only). */
export const bestSuggestion = (word: string, suggestions: string[]) => {
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const suggestion of suggestions) {
    if (/\s/.test(suggestion)) continue;
    const distance = weightedDistance(word, suggestion);
    if (distance < bestDistance) {
      best = suggestion;
      bestDistance = distance;
    }
  }
  return best;
};

const EXPLAIN: Record<ErrorType, (wrong: string, right: string) => string> = {
  "Vowel Harmony": (w, r) =>
    `«${w}» нь эгшиг зохицох ёсыг зөрчсөн. Эр үгэнд эр эгшиг (а, о, у), эм үгэнд эм эгшиг (э, ө, ү) бүхий нөхцөл залгана: «${r}».`,
  Typo: (w, r) => `«${w}» дээр үсэг илүү/дутуу бичигдсэн байна. Зөв бичлэг: «${r}».`,
  Spelling: (w, r) => `«${w}» биш, «${r}» гэж бичнэ.`,
  None: (w) => `«${w}» зөв бичигдсэн.`,
};

export const defaultExplanation = (type: ErrorType, wrong: string, right: string) => EXPLAIN[type](wrong, right);

export const notInDictionary = (word: string) => `«${word}» гэсэн үг Монгол хэлний толь бичигт байхгүй.`;
