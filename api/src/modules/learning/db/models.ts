import type { Model } from "mongoose";
import type {
  IAttemptDocument,
  ICardReviewDocument,
  ICardDocument,
  ILessonDocument,
  IProgressDocument,
} from "./definitions.ts";

export type ILessonModel = Model<ILessonDocument>;
export type ICardModel = Model<ICardDocument>;
export type IProgressModel = Model<IProgressDocument>;
export type IAttemptModel = Model<IAttemptDocument>;
export type ICardReviewModel = Model<ICardReviewDocument>;
