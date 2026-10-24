import { z } from "zod";
import { env } from "../../config.ts";
import type { IModels } from "../../connectionResolvers.ts";
import type { ILessonItem } from "./content.ts";
import {
  WORD_RE,
  bestSuggestion,
  classify,
  defaultExplanation,
  getSpeller,
  levenshtein,
  normalize,
  notInDictionary,
  type ErrorType,
} from "./spell.ts";

// Gemma 4 through the Gemini API (generateContent). The key stays on the
// server; the browser only ever talks to this plugin through the erxes gateway.
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export const aiEnabled = () => Boolean(env.GEMINI_API_KEY);

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(z.object({ text: z.string().optional(), thought: z.boolean().optional() }))
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const callGemma = async (system: string, prompt: string): Promise<string> => {
  const request = (withThinkingConfig: boolean) =>
    fetch(`${ENDPOINT}/${env.GEMMA_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          ...(withThinkingConfig ? { thinkingConfig: { thinkingLevel: "minimal" } } : {}),
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

  let response = await request(true);
  // Older API revisions reject thinkingConfig for Gemma; retry without it.
  if (response.status === 400) response = await request(false);
  if (!response.ok) {
    throw new Error(`Gemma request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  }

  const parsed = responseSchema.parse(await response.json());
  const text = (parsed.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("");
  if (!text.trim()) throw new Error("Gemma returned an empty answer");
  return text;
};

/** Pulls the first JSON object out of a model answer (tolerates ```json fences). */
const extractJson = (text: string): unknown => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON in model answer");
  return JSON.parse(text.slice(start, end + 1));
};

// ---- Strict spelling check (Hunspell dictionary + Gemma 4) ------------------------

const errorTypes = ["Spelling", "Vowel Harmony", "Typo", "None"] as const;

const gemmaCheckSchema = z.object({
  corrected: z.string().default(""),
  words: z
    .array(
      z.object({
        original_word: z.string(),
        is_correct: z.boolean(),
        corrected_word: z.string().default(""),
        error_type: z.string().default("Spelling"),
        explanation_mn: z.string().default(""),
      }),
    )
    .default([]),
  tip: z.string().default(""),
});

export interface IWordCheck {
  original_word: string;
  is_correct: boolean;
  corrected_word: string;
  error_type: ErrorType;
  explanation_mn: string;
  suggestions: string[];
}

export interface ICheckResult {
  source: "gemma" | "offline";
  corrected: string;
  words: IWordCheck[];
  tip: string;
}

const EDITOR_SYSTEM = `Чи бол Монгол хэлний зөв бичих зүйн ХАТУУ шалгагч багш. Кирилл монгол текстийн үг бүрийг
«Монгол хэлний зөв бичих зүйн дүрэм»-ийн дагуу шалга: үгийн үндэс, нөхцөл, эгшиг зохицох ёс, ь/ъ тэмдэг,
урт эгшиг (аа, оо, ээ, өө, уу, үү), том үсэг. Стандарт толь бичигт байхгүй үгийг ХЭЗЭЭ Ч зөв гэж бүү тэмдэглэ
(жишээ нь «асуудалтайй», «байны» буруу). Утга, үгийн дарааллыг бүү өөрчил, зөвхөн зөв бичгийг зас. Өөрөө текст бүү бич.
"error_type" нь яг эдгээрийн нэг: "Spelling", "Vowel Harmony", "Typo", "None".
"explanation_mn" нь тухайн алдааг тайлбарласан тодорхой дүрэм, хүүхдэд ойлгомжтой монгол хэлээр.
Хариуг ЗӨВХӨН дараах JSON хэлбэрээр өг (words дотор БҮХ үгийг дарааллаар нь оруул):
{"corrected": "засварласан бүтэн текст",
 "words": [{"original_word": "...", "is_correct": true, "corrected_word": "...", "error_type": "None", "explanation_mn": ""}],
 "tip": "урам өгөх нэг өгүүлбэр"}`;

const keepCase = (original: string, fixed: string) =>
  original[0] && original[0] === original[0].toUpperCase() && fixed[0] && fixed[0] !== fixed[0].toUpperCase()
    ? fixed[0].toUpperCase() + fixed.slice(1)
    : fixed;

const asErrorType = (value: string | undefined): ErrorType | undefined =>
  errorTypes.find((t) => t === value);

/** Misspellings the lessons already teach, with their rule text. */
const lessonMistakes = async (models: IModels) => {
  const lessons = await models.Lessons.find({}, { items: 1 }).lean();
  const known = new Map<string, { right: string; rule: string; ruleTitle: string }>();
  for (const lesson of lessons) {
    for (const item of lesson.items) {
      for (const wrong of item.wrongForms) {
        known.set(normalize(wrong), { right: item.target, rule: item.rule, ruleTitle: item.ruleTitle });
      }
    }
  }
  return known;
};

/**
 * Word-by-word verdicts. The dictionary decides whether a word exists; Gemma
 * (when on) adds context errors (real words used wrongly, capitalisation) and
 * the explanation — but its correction is only accepted if the dictionary
 * accepts the corrected word too.
 */
export const checkText = async (models: IModels, text: string): Promise<ICheckResult> => {
  const speller = await getSpeller();
  const known = await lessonMistakes(models);

  let gemma: z.infer<typeof gemmaCheckSchema> | null = null;
  if (aiEnabled()) {
    try {
      gemma = gemmaCheckSchema.parse(extractJson(await callGemma(EDITOR_SYSTEM, text)));
    } catch (error) {
      console.error("[education] Gemma check failed, dictionary only:", error);
    }
  }
  const gemmaFlags = (gemma?.words ?? []).filter((w) => !w.is_correct);
  const takeGemma = (word: string) => {
    const index = gemmaFlags.findIndex((w) => normalize(w.original_word) === normalize(word));
    return index < 0 ? undefined : gemmaFlags.splice(index, 1)[0];
  };

  const words: IWordCheck[] = [];
  const corrected = text.replace(WORD_RE, (token) => {
    const g = takeGemma(token);
    const lesson = known.get(normalize(token));
    const inDictionary = speller.spell(token);
    const gFix = g?.corrected_word?.trim();
    const gFixValid = !!gFix && gFix !== token && speller.spell(gFix);

    if (!inDictionary) {
      const suggestions = speller.suggest(token).slice(0, 5);
      const fix =
        (gFixValid ? gFix : undefined) ??
        (lesson && speller.spell(lesson.right) ? lesson.right : undefined) ??
        bestSuggestion(token, suggestions);
      const right = fix ? keepCase(token, fix) : "";
      const type = asErrorType(g?.error_type) && g?.error_type !== "None" ? (g?.error_type as ErrorType) : right ? classify(token, right) : "Spelling";
      words.push({
        original_word: token,
        is_correct: false,
        corrected_word: right,
        error_type: type,
        explanation_mn:
          g?.explanation_mn ||
          lesson?.rule ||
          (right ? `${notInDictionary(token)} ${defaultExplanation(type, token, right)}` : notInDictionary(token)),
        suggestions,
      });
      return right || token;
    }

    if (g && gFixValid && gFix) {
      // A real word that is wrong here (e.g. цаас ↔ цас, missing capital).
      const type = asErrorType(g.error_type) && g.error_type !== "None" ? (g.error_type as ErrorType) : classify(token, gFix);
      words.push({
        original_word: token,
        is_correct: false,
        corrected_word: gFix,
        error_type: type,
        explanation_mn: g.explanation_mn || defaultExplanation(type, token, gFix),
        suggestions: [],
      });
      return gFix;
    }

    words.push({
      original_word: token,
      is_correct: true,
      corrected_word: token,
      error_type: "None",
      explanation_mn: "",
      suggestions: [],
    });
    return token;
  });

  const wrong = words.filter((w) => !w.is_correct).length;
  return {
    source: gemma ? "gemma" : "offline",
    corrected,
    words,
    tip:
      gemma?.tip ||
      (wrong
        ? "Алдаа бүрийн дүрмийг уншаад, өгүүлбэрээ дахин бичиж үзээрэй!"
        : "Толь бичгээр шалгахад алдаа олдсонгүй. Гайхалтай!"),
  };
};

/**
 * Strict verdict for a typed answer against the expected word. Case only
 * matters for proper nouns (`caseSensitive`).
 */
export const checkAnswer = async (typed: string, expected: string, caseSensitive = false) => {
  const speller = await getSpeller();
  const answer = typed.trim();
  const target = expected.trim();
  const sameIgnoringCase = normalize(answer) === normalize(target);
  const exact = caseSensitive ? answer === target : sameIgnoringCase;
  const words = answer.match(WORD_RE) ?? [];
  const inDictionary = words.length > 0 && words.every((w) => speller.spell(w));
  const distance = levenshtein(answer, target);
  const type: ErrorType = exact ? "None" : sameIgnoringCase ? "Spelling" : classify(answer, target);
  return {
    original_word: answer,
    is_correct: exact,
    corrected_word: target,
    error_type: type,
    explanation_mn: exact
      ? "Зөв бичлээ!"
      : sameIgnoringCase
        ? `Оноосон нэрийг том үсгээр эхэлж бичнэ: «${target}».`
        : !inDictionary
          ? `${notInDictionary(answer)} ${defaultExplanation(type, answer, target)}`
          : `«${answer}» нь өөр үг эсвэл өөр хэлбэр. ${defaultExplanation(type, answer, target)}`,
    distance,
    inDictionary,
    caseOnly: sameIgnoringCase && !exact,
  };
};

// ---- Lesson generator --------------------------------------------------------------

const lessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  items: z.array(
    z.object({
      mode: z.enum(["pick", "spot"]),
      sentence: z.string(),
      target: z.string(),
      wrongForms: z.array(z.string()).default([]),
      ruleTitle: z.string().default(""),
      rule: z.string().default(""),
    }),
  ),
});

const GENERATOR_SYSTEM = `Чи бол Монгол хэлний бага ангийн багш. Цээж бичгийн дасгал зохионо.
Өгүүлбэр бүр богино, хүүхдэд ойлгомжтой, кирилл монгол бичгээр, ЗӨВ бичигдсэн байна.
"target" нь өгүүлбэрт яг байгаа хэлбэрээрээ нэг удаа орсон үг. "wrongForms" нь тухайн үгийг хүүхдүүдийн
түгээмэл буруу бичдэг 1-2 хэлбэр (target-аас ялгаатай). "mode" нь "pick" (зөв үгийг сонгох) эсвэл "spot"
(өгүүлбэрээс алдаатай үгийг олох). "rule" нь тухайн алдааг тайлбарлах товч дүрэм.
Хариуг ЗӨВХӨН JSON хэлбэрээр өг:
{"title": "...", "description": "...", "items": [{"mode": "pick", "sentence": "...", "target": "...", "wrongForms": ["..."], "ruleTitle": "...", "rule": "..."}]}`;

export const generateLesson = async (topic: string, count: number) => {
  if (!aiEnabled()) {
    throw new Error("Gemma 4 is off: set GEMINI_API_KEY in the plugin's .env and restart the API");
  }
  const answer = await callGemma(
    GENERATOR_SYSTEM,
    `Сэдэв: ${topic}\nДасгалын тоо: ${count}. Тэн хагасыг "pick", тэн хагасыг "spot" болго.`,
  );
  const lesson = lessonSchema.parse(extractJson(answer));

  // Keep only items the player can actually run.
  const items: ILessonItem[] = lesson.items
    .map((item) => ({
      ...item,
      wrongForms: item.wrongForms
        .map((w) => w.trim())
        .filter((w) => w && w.toLowerCase() !== item.target.toLowerCase()),
    }))
    .filter(
      (item) =>
        item.target &&
        item.sentence.split(item.target).length === 2 &&
        item.wrongForms.length > 0,
    );

  if (items.length < 2) throw new Error("Gemma did not return enough usable sentences; try again");
  return { title: lesson.title, description: lesson.description, items };
};

// ---- Literature & ЭЕШ: summary grading --------------------------------------------

export interface ILiteratureRef {
  title: string;
  author: string;
  excerpt: string;
  theme: string;
  keyPoints: string[];
}

const summarySchema = z.object({
  score: z.coerce.number().min(0).max(100),
  matched_points: z.array(z.string()).default([]),
  missed_points: z.array(z.string()).default([]),
  deviations: z.array(z.string()).default([]),
  feedback_mn: z.string().default(""),
});

const SUMMARY_SYSTEM = `Чи бол ЭЕШ-д бэлддэг Монгол хэл, уран зохиолын багш. Сурагч уран зохиолын эхийн гол санааг
өөрийн үгээр бичсэн. Түүнийг өгөгдсөн «жишиг утга» ба «гол санаанууд»-тай ХАТУУ харьцуулж үнэл.
- "score": 0–100 бүхэл тоо — утгын тохирол (semantic alignment). Ерөнхий, хоосон, эхтэй холбоогүй бол бага оноо.
- "matched_points": сурагчийн хөндсөн гол санаанууд — өгөгдсөн жагсаалтаас ЯГ хуулж бич.
- "missed_points": хөндөөгүй гол санаанууд — өгөгдсөн жагсаалтаас ЯГ хуулж бич.
- "deviations": сурагчийн бичсэн, эхийн утгаас зөрсөн буюу сэдвээс хазайсан өгүүлбэр/санаа (байхгүй бол хоосон).
- "feedback_mn": 1–2 өгүүлбэр, урам өгсөн, тодорхой зөвлөгөө.
Зөв бичгийг бүү үнэл (тусад нь шалгана). Хариуг ЗӨВХӨН JSON хэлбэрээр өг:
{"score": 0, "matched_points": [], "missed_points": [], "deviations": [], "feedback_mn": ""}`;

const STOP = new Set(["бол", "нь", "ба", "болон", "юм", "байна", "байдаг", "гэж", "гэдэг", "энэ", "тэр", "ч", "л", "бас", "их", "маш", "хэрэгтэй"]);

const contentWords = (text: string) =>
  (text.toLowerCase().match(WORD_RE) ?? []).filter((w) => w.length >= 2 && !STOP.has(w));

// Mongolian is agglutinative: compare word starts (нутаг / нутгийн, ёс / ёсыг, дагах / дагана).
const sameRoot = (a: string, b: string) => {
  const need = Math.max(2, Math.min(4, a.length, b.length));
  let i = 0;
  while (i < need && a[i] === b[i]) i += 1;
  return i >= need;
};

/** Offline fallback: root overlap with each key point and the reference theme. */
const offlineSummary = (work: ILiteratureRef, summary: string) => {
  const said = contentWords(summary);
  const hits = (text: string) => {
    const need = contentWords(text);
    return { need: need.length, hit: need.filter((w) => said.some((s) => sameRoot(w, s))).length };
  };
  const covers = (text: string) => {
    const { need, hit } = hits(text);
    return need > 0 && (hit / need >= 0.5 || hit >= 2);
  };
  const matched = work.keyPoints.filter(covers);
  const theme = hits(work.theme);
  const themeHit = theme.need ? theme.hit / theme.need : 0;
  let score = Math.round(
    70 * (work.keyPoints.length ? matched.length / work.keyPoints.length : 0) + 30 * Math.min(1, themeHit * 1.5),
  );
  if (said.length < 5) score = Math.min(score, 40);
  return {
    score,
    matched_points: matched,
    missed_points: work.keyPoints.filter((p) => !matched.includes(p)),
    deviations: [],
    feedback_mn:
      matched.length === work.keyPoints.length
        ? "Гол санаануудыг бүгдийг нь хөндлөө. Сайн байна!"
        : "Орхигдсон санаануудыг нэмж, эхийн утгыг илүү бүрэн илэрхийлээрэй.",
  };
};

export const evaluateSummary = async (work: ILiteratureRef, summary: string) => {
  if (aiEnabled()) {
    try {
      const answer = await callGemma(
        SUMMARY_SYSTEM,
        [
          `Зохиол: «${work.title}» — ${work.author}`,
          `Эх:\n${work.excerpt}`,
          `Жишиг утга: ${work.theme}`,
          `Гол санаанууд: ${JSON.stringify(work.keyPoints)}`,
          `Сурагчийн бичсэн гол санаа:\n${summary}`,
        ].join("\n\n"),
      );
      const result = summarySchema.parse(extractJson(answer));
      // Keep only key points that really are on the list.
      const onList = (p: string) => work.keyPoints.find((k) => normalize(k) === normalize(p));
      const matched = result.matched_points.map(onList).filter((p): p is string => !!p);
      return {
        source: "gemma" as const,
        score: Math.round(result.score),
        matched_points: matched,
        missed_points: work.keyPoints.filter((p) => !matched.includes(p)),
        deviations: result.deviations,
        feedback_mn: result.feedback_mn,
      };
    } catch (error) {
      console.error("[education] Gemma summary grading failed, offline overlap:", error);
    }
  }
  return { source: "offline" as const, ...offlineSummary(work, summary) };
};

const suggestSchema = z.object({
  theme: z.string().min(1),
  keyPoints: z.array(z.string()).min(1),
  genre: z.string().default(""),
});

const SUGGEST_SYSTEM = `Чи бол ЭЕШ-ийн Монгол уран зохиолын багш. Өгөгдсөн эхийг уншаад:
"theme" — эхийн гол санаа, утгыг 1–2 өгүүлбэрээр; "keyPoints" — сурагчийн хөндөх ёстой 3–5 богино гол санаа;
"genre" — төрөл зүйл (шүлэг, өгүүллэг, зүйр цэцэн үг …). Хариуг ЗӨВХӨН JSON хэлбэрээр өг:
{"theme": "...", "keyPoints": ["..."], "genre": "..."}`;

export const suggestLiterature = async (title: string, author: string, excerpt: string) => {
  if (!aiEnabled()) {
    throw new Error("Gemma 4 is off: set GEMINI_API_KEY in the plugin's .env and restart the API");
  }
  const answer = await callGemma(SUGGEST_SYSTEM, `«${title}» — ${author}\n\n${excerpt}`);
  const result = suggestSchema.parse(extractJson(answer));
  return { ...result, keyPoints: result.keyPoints.slice(0, 6) };
};
