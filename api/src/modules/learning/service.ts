import { GraphQLError } from "graphql";
import { env } from "../../config.ts";
import type { Context, IModels } from "../../connectionResolvers.ts";
import {
  CARD_NOTES,
  DEFAULT_AVATAR,
  GALIG_NOTES,
  SEED_CARDS,
  SEED_LESSONS,
  SEED_LITERATURE,
  SHOP_ITEMS,
} from "./content.ts";
import type { IMistake, IProgressDocument } from "./db/definitions.ts";

export const XP = {
  correct: 10,
  lessonDone: 20,
  perfect: 30,
  reviewWord: 5,
  card: 2,
} as const;
export const XP_PER_LEVEL = 100;
const HEATMAP_DAYS = 140;
const MAX_MISTAKES = 100;

type User = Context["user"];

export const fail = (message: string, code = "BAD_USER_INPUT"): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

export const requireUser = ({ user, subdomain }: Context) => {
  if (!user?._id) fail("Login required", "UNAUTHENTICATED");
  if (!subdomain) fail("Tenant required", "FORBIDDEN");
  return user;
};

// ---- Days and streaks -------------------------------------------------------

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: env.EDUCATION_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in the school's time zone. */
export const dayKey = (date: Date = new Date()) => dayFormatter.format(date);

const dayNumber = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / 86_400_000);

export interface IActivityResult {
  streakExtended: boolean;
  freezeUsed: number;
}

/** Records practice for today and moves the streak, spending freezes on gaps. */
export const recordActivity = (progress: IProgressDocument, amount = 1): IActivityResult => {
  const today = dayKey();
  const result: IActivityResult = { streakExtended: false, freezeUsed: 0 };

  if (progress.lastActiveDay !== today) {
    const gap = progress.lastActiveDay
      ? dayNumber(today) - dayNumber(progress.lastActiveDay)
      : Number.POSITIVE_INFINITY;
    const missed = gap - 1;

    if (gap === 1) {
      progress.streak += 1;
    } else if (Number.isFinite(gap) && missed > 0 && progress.freezes >= missed) {
      progress.freezes -= missed;
      result.freezeUsed = missed;
      progress.streak += 1;
    } else {
      progress.streak = 1;
    }
    result.streakExtended = true;
    progress.lastActiveDay = today;
    progress.bestStreak = Math.max(progress.bestStreak, progress.streak);
  }

  progress.activity.set(today, (progress.activity.get(today) ?? 0) + amount);
  progress.markModified("activity");
  progress.updatedAt = new Date();
  return result;
};

export const addXp = (progress: IProgressDocument, xp: number) => {
  progress.xp += xp;
  progress.points += xp;
};

/** A streak that was not continued yesterday (and not covered by freezes) is shown as 0. */
export const liveStreak = (progress: IProgressDocument) => {
  if (!progress.lastActiveDay) return 0;
  const gap = dayNumber(dayKey()) - dayNumber(progress.lastActiveDay);
  if (gap <= 1) return progress.streak;
  return progress.freezes >= gap - 1 ? progress.streak : 0;
};

export const heatmap = (progress: IProgressDocument) => {
  const days: { day: string; count: number }[] = [];
  const now = Date.now();
  for (let i = HEATMAP_DAYS - 1; i >= 0; i -= 1) {
    const day = dayKey(new Date(now - i * 86_400_000));
    days.push({ day, count: progress.activity.get(day) ?? 0 });
  }
  return days;
};

// ---- Seed and progress records ------------------------------------------------

const seeded = new Set<string>();

/** Writes the starter lessons and cards into a tenant the first time it is used. */
export const ensureSeed = async (models: IModels, subdomain: string) => {
  if (seeded.has(subdomain)) return;
  if ((await models.Lessons.countDocuments({ source: "seed" })) === 0) {
    await models.Lessons.insertMany(
      SEED_LESSONS.map((lesson) => ({ ...lesson, source: "seed", createdAt: new Date() })),
    );
  }
  // Upsert by code so existing tenants also get new cards and study notes.
  await models.Cards.bulkWrite(
    SEED_CARDS.map((card, order) => ({
      updateOne: {
        filter: { code: card.code },
        update: { $set: { ...card, ...CARD_NOTES[card.code], galigNote: GALIG_NOTES[card.code] ?? "", order } },
        upsert: true,
      },
    })),
  );
  await models.Literature.bulkWrite(
    SEED_LITERATURE.map((work) => ({
      updateOne: {
        filter: { code: work.code },
        update: { $set: { ...work, source: "seed" } },
        upsert: true,
      },
    })),
  );
  seeded.add(subdomain);
};

const displayName = (user: User) =>
  user.details?.fullName || user.details?.firstName || user.username || user.email || "Сурагч";

export const getProgress = async (models: IModels, user: User) => {
  const existing = await models.Progress.findOne({ userId: user._id });
  if (existing) {
    // Keep the teacher view's names current with the erxes team member record.
    existing.name = displayName(user);
    existing.email = user.email ?? "";
    return existing;
  }
  return models.Progress.create({
    userId: user._id,
    name: displayName(user),
    email: user.email ?? "",
    avatar: DEFAULT_AVATAR,
  });
};

export const rememberMistake = (
  progress: IProgressDocument,
  mistake: Omit<IMistake, "count" | "lastAt">,
) => {
  const existing = progress.mistakes.find((m) => m.word === mistake.word);
  if (existing) {
    existing.count += 1;
    existing.lastAt = new Date();
  } else {
    progress.mistakes.unshift({ ...mistake, count: 1, lastAt: new Date() });
    if (progress.mistakes.length > MAX_MISTAKES) progress.mistakes.length = MAX_MISTAKES;
  }
  progress.markModified("mistakes");
};

export const hasGoldenPack = (progress: IProgressDocument) => progress.owned.includes("pack-golden");

// ---- Output shapes --------------------------------------------------------------

export const progressView = (progress: IProgressDocument, canTeach: boolean) => ({
  userId: progress.userId,
  name: progress.name,
  avatar: progress.avatar || DEFAULT_AVATAR,
  xp: progress.xp,
  points: progress.points,
  level: Math.floor(progress.xp / XP_PER_LEVEL) + 1,
  levelXp: progress.xp % XP_PER_LEVEL,
  levelSize: XP_PER_LEVEL,
  streak: liveStreak(progress),
  bestStreak: progress.bestStreak,
  freezes: progress.freezes,
  owned: progress.owned,
  lessonsCompleted: progress.lessonsCompleted,
  accuracy: progress.answersTotal
    ? Math.round((progress.answersCorrect / progress.answersTotal) * 100)
    : null,
  cardsStudied: progress.cardsStudied,
  teacherRewards: progress.teacherRewards,
  practicedToday: progress.lastActiveDay === dayKey(),
  mistakes: progress.mistakes.map((m) => ({ ...m, lastAt: m.lastAt?.toISOString?.() ?? null })),
  heatmap: heatmap(progress),
  canTeach,
});

// ---- Shop -------------------------------------------------------------------------

export const buyItem = (progress: IProgressDocument, code: string) => {
  const item = SHOP_ITEMS.find((i) => i.code === code) ?? fail("Ийм бараа алга");
  if (!item.repeatable && progress.owned.includes(item.code)) fail("Аль хэдийн авсан байна");
  if (progress.points < item.cost) fail("Оноо хүрэлцэхгүй байна");

  progress.points -= item.cost;
  switch (item.kind) {
    case "freeze":
      progress.freezes += 1;
      break;
    case "reward":
      progress.teacherRewards += 1;
      break;
    case "avatar":
      progress.owned.push(item.code);
      progress.avatar = item.emoji;
      break;
    case "pack":
      progress.owned.push(item.code);
      break;
  }
  return item;
};

export const setAvatar = (progress: IProgressDocument, code: string) => {
  if (code === "default") {
    progress.avatar = DEFAULT_AVATAR;
    return;
  }
  const item = SHOP_ITEMS.find((i) => i.code === code && i.kind === "avatar");
  if (!item || !progress.owned.includes(code)) fail("Энэ аватарыг эхлээд нээнэ үү");
  progress.avatar = item?.emoji ?? DEFAULT_AVATAR;
};
