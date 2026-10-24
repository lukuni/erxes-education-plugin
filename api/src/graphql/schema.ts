import { gql } from "graphql-tag";
import { manifest, env } from "../config.ts";
import type { Context } from "../connectionResolvers.ts";
import { PRACTICE, TEACH } from "../permissions.ts";
import { aiEnabled, checkAnswer, checkText, generateLesson } from "../modules/learning/ai.ts";
import { chimegeEnabled, synthesize } from "../modules/learning/chimege.ts";
import { SHOP_ITEMS, type ILessonItem } from "../modules/learning/content.ts";
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
  SRS_DELAY_MS,
  SRS_LABEL,
  asGrade,
  spellingGrade,
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
    emoji: String!
    premium: Boolean!
    locked: Boolean!
    "Spaced repetition: last grade (0 = never studied) and when the card is due."
    grade: Int!
    reps: Int!
    dueAt: String
    due: Boolean!
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

  type EducationCardReviewResult {
    grade: Int!
    nextLabel: String!
    dueAt: String!
    spelling: EducationWordCheck
    xpEarned: Int!
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
  }

  type Mutation {
    educationSubmitAttempt(lessonId: String!, answers: [EducationAnswerInput!]!): EducationAttemptResult!
    educationReviewComplete(words: [String!]!): EducationProgress!
    educationCardStudied(code: String!): EducationProgress!
    educationShopBuy(code: String!): EducationProgress!
    educationSetAvatar(code: String!): EducationProgress!
    educationAiCheck(text: String!): EducationAiCheck!
    educationTts(text: String!): EducationAudio!
    educationCardReview(code: String!, typed: String, selfGrade: Int): EducationCardReviewResult!
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
      const reviews = await context.models.CardReviews.find({ userId: user._id }).lean();
      const byCode = new Map(reviews.map((r) => [r.cardCode, r]));
      const now = Date.now();
      return cards.map((card) => {
        const review = byCode.get(card.code);
        return {
          ...card,
          meaningMn: card.meaningMn ?? "",
          rule: card.rule ?? "",
          example: card.example ?? "",
          locked: card.premium && !unlocked,
          grade: review?.grade ?? 0,
          reps: review?.reps ?? 0,
          dueAt: review?.dueAt?.toISOString?.() ?? null,
          due: !review || review.dueAt.getTime() <= now,
        };
      });
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

    educationCardReview: async (
      _parent: unknown,
      { code, typed, selfGrade }: { code: string; typed?: string | null; selfGrade?: number | null },
      context: Context,
    ) => {
      const user = await practice(context);
      const card = (await context.models.Cards.findOne({ code }).lean()) ?? fail("Карт олдсонгүй");
      const progress = await getProgress(context.models, user);
      if (card.premium && !hasGoldenPack(progress)) fail("Энэ картыг дэлгүүрээс нээнэ үү");

      // Grade from what the student actually did; self-grade only when nothing was checked.
      const grades: (1 | 2 | 3)[] = [];
      let spelling: Awaited<ReturnType<typeof checkAnswer>> | null = null;
      if (typed?.trim()) {
        // Proper nouns (Монгол, Чингис …) must keep their capital letter.
        const properNoun = ["mongol", "cinggis"].includes(card.code);
        spelling = await checkAnswer(typed, card.cyrillic, properNoun);
        grades.push(spellingGrade(spelling.is_correct, spelling.distance, spelling.caseOnly));
        if (!spelling.is_correct) {
          rememberMistake(progress, {
            word: card.cyrillic,
            wrong: typed.trim(),
            sentence: card.example ?? "",
            ruleTitle: "Флаш карт",
            rule: card.rule ?? spelling.explanation_mn,
          });
        }
      }
      if (grades.length === 0) {
        if (!selfGrade) fail("Үнэлгээ (1–3) өгнө үү");
        grades.push(asGrade(selfGrade ?? 1));
      }
      const grade = asGrade(Math.min(...grades));
      const dueAt = new Date(Date.now() + SRS_DELAY_MS[grade]);

      await context.models.CardReviews.updateOne(
        { userId: user._id, cardCode: code },
        {
          $set: { grade, dueAt, lastReviewedAt: new Date() },
          $inc: { reps: 1, lapses: grade === 1 ? 1 : 0 },
        },
        { upsert: true },
      );

      const xpEarned = grade === 3 ? XP.card + 1 : 1;
      addXp(progress, xpEarned);
      progress.cardsStudied += 1;
      recordActivity(progress, 1);
      await progress.save();

      return {
        grade,
        nextLabel: SRS_LABEL[grade],
        dueAt: dueAt.toISOString(),
        spelling: spelling ? wordView(spelling) : null,
        xpEarned,
      };
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
