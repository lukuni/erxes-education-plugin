import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";
import type { ILessonItem } from "../content.ts";

// schemaWrapper adds _id generation plus the processId/segmentIds fields every
// erxes collection carries — always use it for plugin-owned schemas.

export interface ILesson {
  code?: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  items: ILessonItem[];
  createdBy?: string;
  source: "seed" | "teacher" | "gemma";
  createdAt: Date;
}
export interface ILessonDocument extends ILesson, Document<string> {
  _id: string;
}

const itemSchema = new Schema(
  {
    mode: { type: String, enum: ["pick", "spot"], required: true },
    sentence: { type: String, required: true },
    target: { type: String, required: true },
    wrongForms: { type: [String], default: [] },
    ruleTitle: { type: String, default: "" },
    rule: { type: String, default: "" },
  },
  { _id: false },
);

export const lessonSchema = schemaWrapper(
  new Schema({
    code: { type: String, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    emoji: { type: String, default: "📝" },
    color: { type: String, default: "indigo" },
    items: { type: [itemSchema], default: [] },
    createdBy: { type: String },
    source: { type: String, enum: ["seed", "teacher", "gemma"], default: "teacher" },
    createdAt: { type: Date, default: Date.now },
  }),
);

export interface ICard {
  code: string;
  cyrillic: string;
  script: string;
  galig: string;
  meaning: string;
  meaningMn: string;
  rule: string;
  example: string;
  galigNote: string;
  emoji: string;
  premium: boolean;
  order: number;
}
export interface ICardDocument extends ICard, Document<string> {
  _id: string;
}

export const cardSchema = schemaWrapper(
  new Schema({
    code: { type: String, required: true, index: true },
    cyrillic: { type: String, required: true },
    script: { type: String, required: true },
    galig: { type: String, default: "" },
    meaning: { type: String, default: "" },
    meaningMn: { type: String, default: "" },
    rule: { type: String, default: "" },
    example: { type: String, default: "" },
    galigNote: { type: String, default: "" },
    emoji: { type: String, default: "" },
    premium: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  }),
);

export interface IMistake {
  word: string;
  wrong: string;
  sentence: string;
  ruleTitle: string;
  rule: string;
  count: number;
  lastAt: Date;
}

export interface IProgress {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  xp: number;
  points: number;
  streak: number;
  bestStreak: number;
  lastActiveDay: string;
  // YYYY-MM-DD → number of practice actions that day (heatmap source).
  activity: Map<string, number>;
  freezes: number;
  owned: string[];
  mistakes: IMistake[];
  lessonsCompleted: number;
  answersTotal: number;
  answersCorrect: number;
  cardsStudied: number;
  teacherRewards: number;
  updatedAt: Date;
}
export interface IProgressDocument extends IProgress, Document<string> {
  _id: string;
}

const mistakeSchema = new Schema(
  {
    word: { type: String, required: true },
    wrong: { type: String, default: "" },
    sentence: { type: String, default: "" },
    ruleTitle: { type: String, default: "" },
    rule: { type: String, default: "" },
    count: { type: Number, default: 1 },
    lastAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

export const progressSchema = schemaWrapper(
  new Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    avatar: { type: String, default: "" },
    xp: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastActiveDay: { type: String, default: "" },
    activity: { type: Map, of: Number, default: {} },
    freezes: { type: Number, default: 0 },
    owned: { type: [String], default: [] },
    mistakes: { type: [mistakeSchema], default: [] },
    lessonsCompleted: { type: Number, default: 0 },
    answersTotal: { type: Number, default: 0 },
    answersCorrect: { type: Number, default: 0 },
    cardsStudied: { type: Number, default: 0 },
    teacherRewards: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  }),
);

export interface IAttempt {
  userId: string;
  lessonId: string;
  lessonTitle: string;
  total: number;
  correct: number;
  xpEarned: number;
  createdAt: Date;
}
export interface IAttemptDocument extends IAttempt, Document<string> {
  _id: string;
}

export const attemptSchema = schemaWrapper(
  new Schema({
    userId: { type: String, required: true, index: true },
    lessonId: { type: String, required: true, index: true },
    lessonTitle: { type: String, default: "" },
    total: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    xpEarned: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  }),
);

// Literature & ЭЕШ: an excerpt plus the reference meaning students are graded against.
export interface ILiterature {
  code?: string;
  title: string;
  author: string;
  genre: string;
  excerpt: string;
  theme: string;
  keyPoints: string[];
  source: "seed" | "teacher";
  createdBy?: string;
  createdAt: Date;
}
export interface ILiteratureDocument extends ILiterature, Document<string> {
  _id: string;
}

export const literatureSchema = schemaWrapper(
  new Schema({
    code: { type: String, index: true },
    title: { type: String, required: true },
    author: { type: String, default: "" },
    genre: { type: String, default: "" },
    excerpt: { type: String, required: true },
    theme: { type: String, required: true },
    keyPoints: { type: [String], default: [] },
    source: { type: String, enum: ["seed", "teacher"], default: "teacher" },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
  }),
);
