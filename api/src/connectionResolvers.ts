import type { IMainContext } from "erxes-api-shared/core-types";
import { createGenerateModels } from "erxes-api-shared/utils";
import type { Connection } from "mongoose";
import {
  attemptSchema,
  cardSchema,
  lessonSchema,
  literatureSchema,
  progressSchema,
  type IAttemptDocument,
  type ICardDocument,
  type ILessonDocument,
  type ILiteratureDocument,
  type IProgressDocument,
} from "./modules/learning/db/definitions.ts";
import type {
  IAttemptModel,
  ICardModel,
  ILessonModel,
  ILiteratureModel,
  IProgressModel,
} from "./modules/learning/db/models.ts";

export interface IModels {
  Lessons: ILessonModel;
  Cards: ICardModel;
  Progress: IProgressModel;
  Attempts: IAttemptModel;
  Literature: ILiteratureModel;
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
  models.Literature = db.model<ILiteratureDocument>("education_literature", literatureSchema);

  return models;
};

export const generateModels = createGenerateModels<IModels>(loadClasses);
