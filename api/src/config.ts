import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// CommonJS stacks (erxes-api-shared's ESM bundle does not run under Node,
// NestJS builds CJS) override api/shared's config.ts, which uses ESM-only
// import.meta.url. erxes.json sits at the repository root, two levels above
// both src/ and dist/.
const manifestSchema = z.object({
  name: z.string(),
  title: z.string(),
  version: z.string(),
  api: z.object({
    port: z.number().int(),
    graphql: z.string(),
    health: z.string(),
  }),
});

export const manifest = manifestSchema.parse(
  JSON.parse(readFileSync(join(__dirname, "../../erxes.json"), "utf8")),
);

const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(manifest.api.port),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: optional,
  MONGO_URL: optional,
  UI_ENTRY_URL: optional,
  LOAD_BALANCER_ADDRESS: optional,
  RELEASE_VERSION: optional,
  // Gemma 4 through the Gemini API (Google AI Studio key). Without a key the
  // AI editor falls back to the offline spelling rules built from the lessons.
  GEMINI_API_KEY: optional,
  GEMMA_MODEL: z.string().default("gemma-4-26b-a4b-it"),
  // Chimege Mongolian text-to-speech. CHIMEGE_TTS_URL takes comma-separated
  // candidates; the first one that answers is used.
  CHIMEGE_TOKEN: optional,
  CHIMEGE_TTS_URL: optional,
  CHIMEGE_SPEED: z.string().default("0.95"),
  CHIMEGE_VOICE: optional,
  // Streak days roll over at midnight in this time zone.
  EDUCATION_TIMEZONE: z.string().default("Asia/Ulaanbaatar"),
});

export const env = envSchema.parse(process.env);

export const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};
