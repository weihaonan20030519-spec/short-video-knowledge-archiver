import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL_CONCISE: z.string().default("gemini-2.5-flash-lite"),
  GEMINI_MODEL_LEARNING: z.string().default("gemini-2.5-flash"),
  GEMINI_MODEL_TRANSCRIPTION: z.string().default("gemini-2.5-flash"),
  TRANSCRIPTION_PROVIDER: z.enum(["gemini"]).default("gemini"),
  ANALYSIS_PROVIDER: z.enum(["gemini"]).default("gemini"),
  TRANSCRIPTION_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(25),
  TRANSCRIPTION_RECOMMENDED_MAX_MINUTES: z.coerce.number().int().positive().default(15),
  PORT: z.coerce.number().int().positive().default(3001),
  MIN_RAW_TEXT_LENGTH: z.coerce.number().int().positive().default(30)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
  throw new Error(`Invalid server environment: ${issues}`);
}

export const env = parsed.data;

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
