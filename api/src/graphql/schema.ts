import { gql } from "graphql-tag";
import { manifest, env } from "../config.ts";
import type { Context } from "../connectionResolvers.ts";
import { PRACTICE, TEACH } from "../permissions.ts";
import {
  aiEnabled,
  checkAnswer,
  checkText,
  evaluateSummary,
  generateLesson,
  suggestLiterature,
} from "../modules/learning/ai.ts";
import { chimegeEnabled, synthesize } from "../modules/learning/chimege.ts";
import { HUNT_PASSAGES, SHOP_ITEMS, type ILessonItem } from "../modules/learning/content.ts";
import { WORD_RE, normalize } from "../modules/learning/spell.ts";
import {
  XP,
  addXp,
  buyItem,
  dayKey,
  ensureSeed,
  fail,
  getProgress,
  hasGoldenPack,
  progressView,
  recordActivity,
  rememberMistake,
  requireUser,
  setAvatar,
} from "../modules/learning/service.ts";

// Every type and operation is prefixed with the plugin name: the gateway
// composes all plugins into one supergraph, so names must be unique across it.
export const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.9", import: ["@key"])

  type EducationStatus {
    plugin: String!
    version: String!
    subdomain: String!
    userId: String
    userEmail: String
    aiEnabled: Boolean!
    aiModel: String!
    chimegeEnabled: Boolean!
  }

  type EducationLessonItem {
    mode: String!
    sentence: String!
    target: String!
    wrongForms: [String!]!
    ruleTitle: String!
    rule: String!
  }

  type EducationLesson {
    _id: String!
    title: String!
    description: String!
    emoji: String!
    color: String!
    source: String!
    itemCount: Int!
    items: [EducationLessonItem!]!
    bestScore: Int
    createdAt: String
  }

  type EducationCard {
    _id: String!
    code: String!
    cyrillic: String!
    script: String!
    galig: String!
    meaning: String!
    meaningMn: String!
    rule: String!
    example: String!
    galigNote: String!
    emoji: String!
    premium: Boolean!
    locked: Boolean!
  }

  "Strict per-word verdict. reportJson on EducationAiCheck carries the same data in snake_case."
  type EducationWordCheck {
    originalWord: String!
    isCorrect: Boolean!
    correctedWord: String!
    errorType: String!
    explanationMn: String!
    suggestions: [String!]!
  }

  type EducationAudio {
    audioBase64: String!
    mimeType: String!
  }

  "Mongolian script task: answer by choosing (choice) or typing (typing) the Cyrillic word."
  type EducationScriptResult {
    isCorrect: Boolean!
    correctWord: String!
    galigNote: String!
    check: EducationWordCheck!
    xpEarned: Int!
  }

  "Module B · error hunt: a passage with deliberate spelling mistakes (answers stay on the server)."
  type EducationHuntPassage {
    id: String!
    title: String!
    level: String!
    text: String!
    errorCount: Int!
  }

  type EducationHuntError {
    wrong: String!
    right: String!
    ruleTitle: String!
    rule: String!
    found: Boolean!
    correction: String
    correctionOk: Boolean!
    explanationMn: String!
  }

  type EducationHuntResult {
    score: Int!
    found: Int!
    fixed: Int!
    total: Int!
    falsePositives: [String!]!
    errors: [EducationHuntError!]!
    xpEarned: Int!
  }

  input EducationHuntPickInput {
    word: String!
    correction: String!
  }

  type EducationLiterature {
    _id: String!
    title: String!
    author: String!
    genre: String!
    excerpt: String!
    theme: String!
    keyPoints: [String!]!
    source: String!
  }

  type EducationSummaryResult {
    source: String!
    score: Int!
    matchedPoints: [String!]!
    missedPoints: [String!]!
    deviations: [String!]!
    feedbackMn: String!
    theme: String!
    spelling: [EducationWordCheck!]!
    correctedText: String!
    xpEarned: Int!
  }

  type EducationLiteratureSuggestion {
    theme: String!
    keyPoints: [String!]!
    genre: String!
  }

  type EducationMistake {
    word: String!
    wrong: String!
    sentence: String!
    ruleTitle: String!
    rule: String!
    count: Int!
    lastAt: String
  }

  type EducationDay {
    day: String!
    count: Int!
  }

  type EducationProgress {
    userId: String!
    name: String!
    avatar: String!
    xp: Int!
    points: Int!
    level: Int!
    levelXp: Int!
    levelSize: Int!
    streak: Int!
    bestStreak: Int!
    freezes: Int!
    owned: [String!]!
    lessonsCompleted: Int!
    accuracy: Int
    cardsStudied: Int!
    teacherRewards: Int!
    practicedToday: Boolean!
    mistakes: [EducationMistake!]!
    heatmap: [EducationDay!]!
    canTeach: Boolean!
  }

  type EducationShopItem {
    code: String!
    kind: String!
    title: String!
    description: String!
    emoji: String!
    cost: Int!
    repeatable: Boolean!
  }

  type EducationAttemptResult {
    xpEarned: Int!
    correct: Int!
    total: Int!
    perfect: Boolean!
    streakExtended: Boolean!
    freezeUsed: Int!
    progress: EducationProgress!
  }

  type EducationAiIssue {
    wrong: String!
    right: String!
    rule: String!
  }

  type EducationAiCheck {
    source: String!
    corrected: String!
    issues: [EducationAiIssue!]!
    words: [EducationWordCheck!]!
    reportJson: String!
    tip: String!
    xpEarned: Int!
  }

  type EducationStudent {
    userId: String!
    name: String!
    email: String!
    avatar: String!
    xp: Int!
    level: Int!
    streak: Int!
    lessonsCompleted: Int!
    accuracy: Int
    mistakeCount: Int!
    lastActiveDay: String!
    activeToday: Boolean!
    teacherRewards: Int!
  }

  type EducationClassMistake {
    word: String!
    ruleTitle: String!
    rule: String!
    total: Int!
    students: Int!
  }

  type EducationClassOverview {
    studentCount: Int!
    activeToday: Int!
    lessonsCompleted: Int!
    accuracy: Int
    students: [EducationStudent!]!
    topMistakes: [EducationClassMistake!]!
  }

  input EducationAnswerInput {
    index: Int!
    correct: Boolean!
  }

  input EducationLessonItemInput {
    mode: String!
    sentence: String!
    target: String!
    wrongForms: [String!]!
    ruleTitle: String
    rule: String
  }

  type Query {
    educationStatus: EducationStatus!
    educationLessons: [EducationLesson!]!
    educationLesson(_id: String!): EducationLesson
    educationCards: [EducationCard!]!
    educationMe: EducationProgress!
    educationShopItems: [EducationShopItem!]!
    educationClassOverview: EducationClassOverview!
    educationHuntPassages: [EducationHuntPassage!]!
    educationLiteratureList: [EducationLiterature!]!
    educationLiterature(_id: String!): EducationLiterature
  }

  type Mutation {
    educationSubmitAttempt(lessonId: String!, answers: [EducationAnswerInput!]!): EducationAttemptResult!
    educationReviewComplete(words: [String!]!): EducationProgress!
    educationCardStudied(code: String!): EducationProgress!
    educationShopBuy(code: String!): EducationProgress!
    educationSetAvatar(code: String!): EducationProgress!
    educationAiCheck(text: String!): EducationAiCheck!
    educationTts(text: String!): EducationAudio!
    educationScriptAnswer(code: String!, answer: String!, mode: String!): EducationScriptResult!
    educationHuntCheck(id: String!, picks: [EducationHuntPickInput!]!): EducationHuntResult!
    educationLiteratureAnswer(_id: String!, summary: String!): EducationSummaryResult!
    educationLiteratureAdd(title: String!, author: String!, genre: String, excerpt: String!, theme: String!, keyPoints: [String!]!): EducationLiterature!
    educationLiteratureRemove(_id: String!): Boolean!
    educationLiteratureSuggest(title: String!, author: String!, excerpt: String!): EducationLiteratureSuggestion!
    educationLessonAdd(title: String!, description: String, emoji: String, items: [EducationLessonItemInput!]!): EducationLesson!
    educationLessonGenerate(topic: String!, count: Int): EducationLesson!
    educationLessonRemove(_id: String!): Boolean!
  }
`;

// ---- helpers -----------------------------------------------------------------------

/** Practice actions: logged in, tenant set, and the educationPractice action granted. */
const practice = async (context: Context) => {
  const user = requireUser(context);
  await context.checkPermission(PRACTICE);
  await ensureSeed(context.models, context.subdomain);
  return user;
};

const teach = async (context: Context) => {
  const user = requireUser(context);
  await context.checkPermission(TEACH);
  await ensureSeed(context.models, context.subdomain);
  return user;
};

const canTeach = async (context: Context) => {
  try {
    await context.checkPermission(TEACH);
    return true;
  } catch {
    return false;
  }
};

const MODES = new Set(["pick", "spot"]);

const validItems = (items: ILessonItem[]) => {
  const clean = items.map((item) => ({
    mode: item.mode,
    sentence: item.sentence.trim(),
    target: item.target.trim(),
    wrongForms: item.wrongForms.map((w) => w.trim()).filter(Boolean),
    ruleTitle: item.ruleTitle?.trim() ?? "",
    rule: item.rule?.trim() ?? "",
  }));
  if (clean.length === 0 || clean.length > 30) fail("1–30 өгүүлбэр оруулна уу");
  for (const item of clean) {
    if (!MODES.has(item.mode)) fail("mode нь pick эсвэл spot байна");
    if (!item.target || item.sentence.split(item.target).length !== 2) {
      fail(`"${item.target}" үг өгүүлбэрт яг нэг удаа орсон байх ёстой: ${item.sentence}`);
    }
    if (item.wrongForms.length === 0) fail(`"${item.target}" үгийн буруу хэлбэрийг оруулна уу`);
  }
  return clean;
};

interface ILessonRow {
  _id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  source: string;
  items: ILessonItem[];
  createdAt?: Date;
}

const lessonView = (lesson: ILessonRow, bestScore: number | null = null) => ({
  _id: lesson._id,
  title: lesson.title,
  description: lesson.description,
  emoji: lesson.emoji,
  color: lesson.color,
  source: lesson.source,
  items: lesson.items,
  itemCount: lesson.items.length,
  bestScore,
  createdAt: lesson.createdAt?.toISOString?.() ?? null,
});

type WordVerdict = Awaited<ReturnType<typeof checkText>>["words"][number];

const wordView = (w: WordVerdict | Awaited<ReturnType<typeof checkAnswer>>) => ({
  originalWord: w.original_word,
  isCorrect: w.is_correct,
  correctedWord: w.corrected_word,
  errorType: w.error_type,
  explanationMn: w.explanation_mn,
  suggestions: "suggestions" in w ? w.suggestions : [],
});

// ---- resolvers ------------------------------------------------------------------------

export const resolvers = {
  Query: {
    educationStatus: (_parent: unknown, _args: unknown, { subdomain, user }: Context) => ({
      plugin: manifest.name,
      version: manifest.version,
      subdomain,
      userId: user?._id ?? null,
      userEmail: user?.email ?? null,
      aiEnabled: aiEnabled(),
      aiModel: env.GEMMA_MODEL,
      chimegeEnabled: chimegeEnabled(),
    }),

    educationLessons: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = await practice(context);
      const lessons = await context.models.Lessons.find().sort({ createdAt: 1 }).limit(100).lean();
      const best = await context.models.Attempts.aggregate<{ _id: string; best: number }>([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: "$lessonId",
            best: { $max: { $round: [{ $multiply: [{ $divide: ["$correct", { $max: ["$total", 1] }] }, 100] }, 0] } },
          },
        },
      ]);
      const bestById = new Map(best.map((b) => [b._id, b.best]));
      return lessons.map((lesson) => lessonView(lesson, bestById.get(lesson._id) ?? null));
    },

    educationLesson: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
      await practice(context);
      const lesson = await context.models.Lessons.findById(_id).lean();
      return lesson ? lessonView(lesson) : null;
    },

    educationCards: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = await practice(context);
      const progress = await getProgress(context.models, user);
      const unlocked = hasGoldenPack(progress);
      const cards = await context.models.Cards.find().sort({ order: 1 }).limit(200).lean();
      return cards.map((card) => ({
        ...card,
        meaningMn: card.meaningMn ?? "",
        rule: card.rule ?? "",
        example: card.example ?? "",
        galigNote: card.galigNote ?? "",
        locked: card.premium && !unlocked,
      }));
    },

    educationMe: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = await practice(context);
      const progress = await getProgress(context.models, user);
      await progress.save();
      return progressView(progress, await canTeach(context));
    },

    educationShopItems: async (_parent: unknown, _args: unknown, context: Context) => {
      await practice(context);
      return SHOP_ITEMS;
    },

    educationHuntPassages: async (_parent: unknown, _args: unknown, context: Context) => {
      await practice(context);
      return HUNT_PASSAGES.map(({ errors, ...p }) => ({ ...p, errorCount: errors.length }));
    },

    educationLiteratureList: async (_parent: unknown, _args: unknown, context: Context) => {
      await practice(context);
      return context.models.Literature.find().sort({ source: 1, createdAt: 1 }).limit(200).lean();
    },

    educationLiterature: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
      await practice(context);
      return context.models.Literature.findById(_id).lean();
    },

    educationClassOverview: async (_parent: unknown, _args: unknown, context: Context) => {
      await teach(context);
      const today = dayKey();
      const rows = await context.models.Progress.find().sort({ xp: -1 }).limit(500).lean();

      const students = rows.map((row) => ({
        userId: row.userId,
        name: row.name || row.email || row.userId,
        email: row.email,
        avatar: row.avatar,
        xp: row.xp,
        level: Math.floor(row.xp / 100) + 1,
        streak: row.streak,
        lessonsCompleted: row.lessonsCompleted,
        accuracy: row.answersTotal ? Math.round((row.answersCorrect / row.answersTotal) * 100) : null,
        mistakeCount: row.mistakes.length,
        lastActiveDay: row.lastActiveDay,
        activeToday: row.lastActiveDay === today,
        teacherRewards: row.teacherRewards,
      }));

      const byWord = new Map<string, { word: string; ruleTitle: string; rule: string; total: number; students: number }>();
      for (const row of rows) {
        for (const mistake of row.mistakes) {
          const entry = byWord.get(mistake.word) ?? {
            word: mistake.word,
            ruleTitle: mistake.ruleTitle,
            rule: mistake.rule,
            total: 0,
            students: 0,
          };
          entry.total += mistake.count;
          entry.students += 1;
          byWord.set(mistake.word, entry);
        }
      }

      const answersTotal = rows.reduce((sum, r) => sum + r.answersTotal, 0);
      const answersCorrect = rows.reduce((sum, r) => sum + r.answersCorrect, 0);

      return {
        studentCount: rows.length,
        activeToday: students.filter((s) => s.activeToday).length,
        lessonsCompleted: rows.reduce((sum, r) => sum + r.lessonsCompleted, 0),
        accuracy: answersTotal ? Math.round((answersCorrect / answersTotal) * 100) : null,
        students,
        topMistakes: [...byWord.values()].sort((a, b) => b.total - a.total).slice(0, 10),
      };
    },
  },

  Mutation: {
    educationSubmitAttempt: async (
      _parent: unknown,
      { lessonId, answers }: { lessonId: string; answers: { index: number; correct: boolean }[] },
      context: Context,
    ) => {
      const user = await practice(context);
      const lesson = (await context.models.Lessons.findById(lessonId).lean()) ?? fail("Хичээл олдсонгүй");

      // One answer per item, judged against the stored lesson.
      const seen = new Set<number>();
      const valid = answers.filter(
        (a) => Number.isInteger(a.index) && a.index >= 0 && a.index < lesson.items.length && !seen.has(a.index) && seen.add(a.index),
      );
      if (valid.length === 0) fail("Хариулт алга");

      const progress = await getProgress(context.models, user);
      const correct = valid.filter((a) => a.correct).length;
      const perfect = correct === lesson.items.length;
      for (const answer of valid) {
        const item = lesson.items[answer.index];
        if (!answer.correct && item) {
          rememberMistake(progress, {
            word: item.target,
            wrong: item.wrongForms[0] ?? "",
            sentence: item.sentence,
            ruleTitle: item.ruleTitle,
            rule: item.rule,
          });
        }
      }

      const xpEarned = correct * XP.correct + XP.lessonDone + (perfect ? XP.perfect : 0);
      addXp(progress, xpEarned);
      progress.lessonsCompleted += 1;
      progress.answersTotal += valid.length;
      progress.answersCorrect += correct;
      const activity = recordActivity(progress, valid.length);
      await progress.save();

      await context.models.Attempts.create({
        userId: user._id,
        lessonId,
        lessonTitle: lesson.title,
        total: lesson.items.length,
        correct,
        xpEarned,
      });

      return {
        xpEarned,
        correct,
        total: lesson.items.length,
        perfect,
        ...activity,
        progress: progressView(progress, await canTeach(context)),
      };
    },

    educationReviewComplete: async (_parent: unknown, { words }: { words: string[] }, context: Context) => {
      const user = await practice(context);
      const progress = await getProgress(context.models, user);
      const mastered = new Set(words);
      const before = progress.mistakes.length;
      progress.mistakes = progress.mistakes.filter((m) => !mastered.has(m.word));
      const cleared = before - progress.mistakes.length;
      progress.markModified("mistakes");
      if (cleared > 0) {
        addXp(progress, cleared * XP.reviewWord);
        recordActivity(progress, cleared);
      }
      await progress.save();
      return progressView(progress, await canTeach(context));
    },

    educationCardStudied: async (_parent: unknown, { code }: { code: string }, context: Context) => {
      const user = await practice(context);
      const card = (await context.models.Cards.findOne({ code }).lean()) ?? fail("Карт олдсонгүй");
      const progress = await getProgress(context.models, user);
      if (card.premium && !hasGoldenPack(progress)) fail("Энэ картыг дэлгүүрээс нээнэ үү");
      addXp(progress, XP.card);
      progress.cardsStudied += 1;
      recordActivity(progress, 1);
      await progress.save();
      return progressView(progress, await canTeach(context));
    },

    educationScriptAnswer: async (
      _parent: unknown,
      { code, answer, mode }: { code: string; answer: string; mode: string },
      context: Context,
    ) => {
      const user = await practice(context);
      if (mode !== "choice" && mode !== "typing") fail("mode нь choice эсвэл typing байна");
      if (!answer.trim() || answer.length > 100) fail("Хариултаа оруулна уу");
      const card = (await context.models.Cards.findOne({ code }).lean()) ?? fail("Үг олдсонгүй");
      const progress = await getProgress(context.models, user);
      if (card.premium && !hasGoldenPack(progress)) fail("Энэ үгийг дэлгүүрээс нээнэ үү");

      // Proper nouns (Монгол, Чингис) keep their capital letter when typed.
      const properNoun = ["mongol", "cinggis"].includes(card.code);
      const check = await checkAnswer(answer, card.cyrillic, mode === "typing" && properNoun);
      const xpEarned = check.is_correct ? (mode === "typing" ? 15 : 10) : 2;
      if (!check.is_correct) {
        rememberMistake(progress, {
          word: card.cyrillic,
          wrong: answer.trim(),
          sentence: card.example ?? "",
          ruleTitle: "Монгол бичиг → кирилл",
          rule: card.galigNote ?? check.explanation_mn,
        });
      }
      addXp(progress, xpEarned);
      progress.answersTotal += 1;
      progress.answersCorrect += check.is_correct ? 1 : 0;
      progress.cardsStudied += 1;
      recordActivity(progress, 1);
      await progress.save();

      return {
        isCorrect: check.is_correct,
        correctWord: card.cyrillic,
        galigNote: card.galigNote ?? "",
        check: wordView(check),
        xpEarned,
      };
    },

    educationHuntCheck: async (
      _parent: unknown,
      { id, picks }: { id: string; picks: { word: string; correction: string }[] },
      context: Context,
    ) => {
      const user = await practice(context);
      const passage = HUNT_PASSAGES.find((p) => p.id === id) ?? fail("Эх олдсонгүй");
      if (picks.length > 30) fail("Хэт олон үг сонгосон байна");
      const textWords = new Set((passage.text.match(WORD_RE) ?? []).map(normalize));
      const byWord = new Map(picks.map((p) => [normalize(p.word.trim()), p.correction.trim()]));

      const errors = await Promise.all(
        passage.errors.map(async (e) => {
          const correction = byWord.get(normalize(e.wrong));
          const found = correction !== undefined;
          const check = found && correction ? await checkAnswer(correction, e.right) : null;
          const correctionOk = !!check?.is_correct;
          return {
            ...e,
            found,
            correction: correction ?? null,
            correctionOk,
            explanationMn: !found
              ? `Алдааг олоогүй: «${e.wrong}» → «${e.right}». ${e.rule}`
              : correctionOk
                ? e.rule
                : `Алдааг олсон ч засвар буруу: «${correction || "—"}». Зөв нь «${e.right}». ${e.rule}`,
          };
        }),
      );
      const errorWords = new Set(passage.errors.map((e) => normalize(e.wrong)));
      const falsePositives = [...byWord.keys()].filter((w) => textWords.has(w) && !errorWords.has(w));

      const found = errors.filter((e) => e.found).length;
      const fixed = errors.filter((e) => e.correctionOk).length;
      const total = passage.errors.length;
      const score = Math.max(0, Math.round((100 * (found + fixed - falsePositives.length)) / (2 * total)));
      const xpEarned = found * 5 + fixed * 5 + (score === 100 ? 20 : 0);

      const progress = await getProgress(context.models, user);
      for (const e of errors.filter((x) => !x.correctionOk)) {
        rememberMistake(progress, { word: e.right, wrong: e.wrong, sentence: passage.text, ruleTitle: e.ruleTitle, rule: e.rule });
      }
      addXp(progress, xpEarned);
      progress.answersTotal += total;
      progress.answersCorrect += fixed;
      recordActivity(progress, total);
      await progress.save();

      return { score, found, fixed, total, falsePositives, errors, xpEarned };
    },

    educationLiteratureAnswer: async (
      _parent: unknown,
      { _id, summary }: { _id: string; summary: string },
      context: Context,
    ) => {
      const user = await practice(context);
      const text = summary.trim();
      if (text.length < 10) fail("Гол санаагаа дор хаяж нэг өгүүлбэрээр бичнэ үү");
      if (text.length > 3000) fail("3000 тэмдэгтээс богино бичнэ үү");
      const work = (await context.models.Literature.findById(_id).lean()) ?? fail("Зохиол олдсонгүй");

      // Meaning and spelling are graded independently, both from the typed text.
      const [meaning, spelling] = await Promise.all([evaluateSummary(work, text), checkText(context.models, text)]);
      const wrong = spelling.words.filter((w) => !w.is_correct);

      const progress = await getProgress(context.models, user);
      const xpEarned = Math.round(meaning.score / 10) + (wrong.length === 0 ? 5 : 0);
      addXp(progress, xpEarned);
      recordActivity(progress, 1);
      for (const w of wrong.slice(0, 5)) {
        rememberMistake(progress, {
          word: w.corrected_word || w.original_word,
          wrong: w.original_word,
          sentence: "",
          ruleTitle: w.error_type,
          rule: w.explanation_mn,
        });
      }
      await progress.save();

      return {
        source: meaning.source,
        score: meaning.score,
        matchedPoints: meaning.matched_points,
        missedPoints: meaning.missed_points,
        deviations: meaning.deviations,
        feedbackMn: meaning.feedback_mn,
        theme: work.theme,
        spelling: wrong.map(wordView),
        correctedText: spelling.corrected,
        xpEarned,
      };
    },

    educationLiteratureAdd: async (
      _parent: unknown,
      args: { title: string; author: string; genre?: string; excerpt: string; theme: string; keyPoints: string[] },
      context: Context,
    ) => {
      const user = await teach(context);
      const keyPoints = args.keyPoints.map((k) => k.trim()).filter(Boolean).slice(0, 8);
      if (!args.title.trim() || !args.excerpt.trim() || !args.theme.trim()) fail("Нэр, эх, гол санааг бөглөнө үү");
      if (keyPoints.length === 0) fail("Дор хаяж нэг гол санаа оруулна уу");
      if (args.excerpt.length > 6000) fail("Эх 6000 тэмдэгтээс богино байна");
      const work = await context.models.Literature.create({
        title: args.title.trim(),
        author: args.author.trim(),
        genre: args.genre?.trim() ?? "",
        excerpt: args.excerpt.trim(),
        theme: args.theme.trim(),
        keyPoints,
        source: "teacher",
        createdBy: user._id,
      });
      return work.toObject();
    },

    educationLiteratureRemove: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
      await teach(context);
      const { deletedCount } = await context.models.Literature.deleteOne({ _id });
      return deletedCount > 0;
    },

    educationLiteratureSuggest: async (
      _parent: unknown,
      { title, author, excerpt }: { title: string; author: string; excerpt: string },
      context: Context,
    ) => {
      await teach(context);
      if (!excerpt.trim()) fail("Эхээ оруулна уу");
      try {
        return await suggestLiterature(title.trim(), author.trim(), excerpt.trim().slice(0, 6000));
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Gemma failed");
      }
    },

    educationShopBuy: async (_parent: unknown, { code }: { code: string }, context: Context) => {
      const user = await practice(context);
      const progress = await getProgress(context.models, user);
      buyItem(progress, code);
      await progress.save();
      return progressView(progress, await canTeach(context));
    },

    educationSetAvatar: async (_parent: unknown, { code }: { code: string }, context: Context) => {
      const user = await practice(context);
      const progress = await getProgress(context.models, user);
      setAvatar(progress, code);
      await progress.save();
      return progressView(progress, await canTeach(context));
    },

    educationAiCheck: async (_parent: unknown, { text }: { text: string }, context: Context) => {
      const user = await practice(context);
      const trimmed = text.trim();
      if (!trimmed) fail("Текстээ бичнэ үү");
      if (trimmed.length > 2000) fail("2000 тэмдэгтээс богино текст оруулна уу");

      const result = await checkText(context.models, trimmed);
      const wrong = result.words.filter((w) => !w.is_correct);

      // Writing practice counts toward the streak; a clean text earns a bonus.
      const progress = await getProgress(context.models, user);
      const xpEarned = wrong.length === 0 ? 10 : 5;
      addXp(progress, xpEarned);
      recordActivity(progress, 1);
      await progress.save();

      return {
        source: result.source,
        corrected: result.corrected,
        tip: result.tip,
        xpEarned,
        issues: wrong.map((w) => ({ wrong: w.original_word, right: w.corrected_word, rule: w.explanation_mn })),
        words: result.words.map(wordView),
        reportJson: JSON.stringify(
          result.words.map(({ suggestions: _suggestions, ...w }) => w),
          null,
          2,
        ),
      };
    },

    educationTts: async (_parent: unknown, { text }: { text: string }, context: Context) => {
      await practice(context);
      const clean = text.trim();
      if (!clean || clean.length > 300) fail("1–300 тэмдэгт оруулна уу");
      try {
        const { audio, mimeType } = await synthesize(clean);
        return { audioBase64: audio, mimeType };
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Chimege TTS failed", "SERVICE_UNAVAILABLE");
      }
    },


    educationLessonAdd: async (
      _parent: unknown,
      args: { title: string; description?: string; emoji?: string; items: ILessonItem[] },
      context: Context,
    ) => {
      const user = await teach(context);
      if (!args.title.trim()) fail("Гарчиг оруулна уу");
      const lesson = await context.models.Lessons.create({
        title: args.title.trim(),
        description: args.description?.trim() ?? "",
        emoji: args.emoji?.trim() || "📝",
        color: "mint",
        items: validItems(args.items),
        createdBy: user._id,
        source: "teacher",
      });
      return lessonView(lesson.toObject());
    },

    educationLessonGenerate: async (
      _parent: unknown,
      { topic, count }: { topic: string; count?: number },
      context: Context,
    ) => {
      const user = await teach(context);
      if (!topic.trim()) fail("Сэдвээ бичнэ үү");
      const size = Math.min(Math.max(count ?? 6, 2), 12);
      let generated: Awaited<ReturnType<typeof generateLesson>>;
      try {
        generated = await generateLesson(topic.trim().slice(0, 200), size);
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Gemma failed");
      }
      const lesson = await context.models.Lessons.create({
        ...generated,
        emoji: "✨",
        color: "amber",
        createdBy: user._id,
        source: "gemma",
      });
      return lessonView(lesson.toObject());
    },

    educationLessonRemove: async (_parent: unknown, { _id }: { _id: string }, context: Context) => {
      await teach(context);
      const { deletedCount } = await context.models.Lessons.deleteOne({ _id });
      return deletedCount > 0;
    },
  },
};
