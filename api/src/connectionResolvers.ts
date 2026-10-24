import type { IMainContext } from "erxes-api-shared/core-types";
import { createGenerateModels } from "erxes-api-shared/utils";
import type { Connection } from "mongoose";
import {
  attemptSchema,
  cardReviewSchema,
  cardSchema,
  lessonSchema,
  progressSchema,
  type IAttemptDocument,
  type ICardDocument,
  type ICardReviewDocument,
  type ILessonDocument,
  type IProgressDocument,
} from "./modules/learning/db/definitions.ts";
import type {
  IAttemptModel,
  ICardModel,
  ICardReviewModel,
  ILessonModel,
  IProgressModel,
} from "./modules/learning/db/models.ts";

export interface IModels {
  Lessons: ILessonModel;
  Cards: ICardModel;
  Progress: IProgressModel;
  Attempts: IAttemptModel;
  CardReviews: ICardReviewModel;
}

/**
 * GraphQL resolver context: what `apolloServerContext` in main.ts returns.
 * `subdomain` is the tenant, `models` are bound to that tenant's database.
 */
// IMainContext declares `models?: any`, which would absorb the typed IModels
// in a plain intersection — Omit it first so resolvers get real types.
export type Context = Omit<IMainContext, "models"> & {
  subdomain: string;
  models: IModels;
};

// Every model must come from this factory: createGenerateModels binds the
// connection for the request's tenant (Mongo `useDb` per organization on
// SaaS), so resolvers never touch another tenant's collections.
const loadClasses = (db: Connection) => {
  const models = {} as IModels;

  models.Lessons = db.model<ILessonDocument>("education_lessons", lessonSchema);
  models.Cards = db.model<ICardDocument>("education_cards", cardSchema);
  models.Progress = db.model<IProgressDocument>("education_progress", progressSchema);
  models.Attempts = db.model<IAttemptDocument>("education_attempts", attemptSchema);
  models.CardReviews = db.model<ICardReviewDocument>("education_card_reviews", cardReviewSchema);

  return models;
};

export const generateModels = createGenerateModels<IModels>(loadClasses);
