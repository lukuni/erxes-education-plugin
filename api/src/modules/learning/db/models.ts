import type { Model } from "mongoose";
import type {
  IAttemptDocument,
  ILiteratureDocument,
  ICardDocument,
  ILessonDocument,
  IProgressDocument,
} from "./definitions.ts";

export type ILessonModel = Model<ILessonDocument>;
export type ICardModel = Model<ICardDocument>;
export type IProgressModel = Model<IProgressDocument>;
export type IAttemptModel = Model<IAttemptDocument>;
export type ILiteratureModel = Model<ILiteratureDocument>;
