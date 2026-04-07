import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL_CONCISE: z.string().default("gemini-2.5-flash-lite"),
  GEMINI_MODEL_LEARNING: z.string().default("gemini-2.5-flash"),
  GEMINI_MODEL_TRANSCRIPTION: z.string().default("gemini-2.5-flash"),
  APP_ORIGIN: z.string().optional(),
  TRANSCRIPTION_PROVIDER: z.enum(["gemini"]).default("gemini"),
  ANALYSIS_PROVIDER: z.enum(["gemini"]).default("gemini"),
  TRANSCRIPTION_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(50),
  TRANSCRIPTION_RECOMMENDED_MAX_MINUTES: z.coerce.number().int().positive().default(15),
  TRANSCRIPTION_FILE_READY_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  TRANSCRIPTION_FILE_READY_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  ARTICLE_IMPORT_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  ARTICLE_IMPORT_MAX_REDIRECTS: z.coerce.number().int().min(0).default(3),
  ARTICLE_IMPORT_MAX_RESPONSE_BYTES: z.coerce.number().int().positive().default(750_000),
  PORT: z.coerce.number().int().positive().default(3001),
  MIN_RAW_TEXT_LENGTH: z.coerce.number().int().positive().default(30)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
  throw new Error(`Invalid server environment: ${issues}`);
}

export const env = parsed.data;

export function resolveAllowedAppOrigins() {
  return (env.APP_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveAnalyzeModel(mode: "concise" | "learning") {
  if (mode === "concise") {
    return env.GEMINI_MODEL_CONCISE;
  }

  return env.GEMINI_MODEL_LEARNING;
}

export function requireGeminiKey(feature: "analysis" | "transcription") {
  if (!env.GEMINI_API_KEY) {
    throw new Error(`GEMINI_API_KEY is required to use the Gemini ${feature} provider`);
  }

  return env.GEMINI_API_KEY;
}
