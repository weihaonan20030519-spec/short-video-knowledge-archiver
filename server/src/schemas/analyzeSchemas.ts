import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const sourcePlatformSchema = z.enum([
  "tiktok",
  "bilibili",
  "xiaohongshu",
  "other",
  "unknown"
]);

export const analyzeModeSchema = z.enum(["concise", "learning"]);
export const appLanguageSchema = z.enum(["zh-CN", "en"]);
export const highlightToneSchema = z.enum(["core", "method", "action", "warning"]);

export const textHighlightSchema = z.object({
  text: z.string().min(1),
  tone: highlightToneSchema
});

export const analyzeRequestSchema = z.object({
  mode: analyzeModeSchema,
  appLanguage: appLanguageSchema.optional().default("zh-CN"),
  title: z.string().trim().optional(),
  sourcePlatform: sourcePlatformSchema,
  originalUrl: z.string().url().nullable(),
  rawText: z.string()
});

export const conciseOutputSchema = z.object({
  summary: z.string(),
  bullets: z.array(z.string()).min(3).max(5),
  highlights: z
    .object({
      summary: z.array(textHighlightSchema).max(4).optional(),
      bullets: z.array(textHighlightSchema).max(6).optional()
    })
    .optional()
});

const conciseOutputForModelSchema = z.object({
  summary: z.string(),
  bullets: z.array(z.string()).min(3).max(5)
});

export const learningOutputSchema = z.object({
  coreConclusion: z.string(),
  logicFramework: z.array(z.string()),
  keyDetails: z.array(z.string()),
  reusablePoints: z.array(z.string()),
  highlights: z
    .object({
      coreConclusion: z.array(textHighlightSchema).max(4).optional(),
      logicFramework: z.array(textHighlightSchema).max(6).optional(),
      keyDetails: z.array(textHighlightSchema).max(6).optional(),
      reusablePoints: z.array(textHighlightSchema).max(6).optional()
    })
    .optional()
});

const learningOutputForModelSchema = z.object({
  coreConclusion: z.string(),
  logicFramework: z.array(z.string()),
  keyDetails: z.array(z.string()),
  reusablePoints: z.array(z.string())
});

function normalizeJsonSchema(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const { $schema: _schema, definitions, $ref, ...rest } = value as Record<string, unknown>;
  const definitionMap =
    definitions && typeof definitions === "object" && !Array.isArray(definitions)
      ? (definitions as Record<string, unknown>)
      : undefined;

  if (typeof $ref === "string" && $ref.startsWith("#/definitions/") && definitionMap) {
    const definitionName = $ref.replace("#/definitions/", "");
    const rootDefinition = definitionMap[definitionName];

    if (rootDefinition && typeof rootDefinition === "object" && !Array.isArray(rootDefinition)) {
      const remainingDefinitions = Object.fromEntries(
        Object.entries(definitionMap).filter(([key]) => key !== definitionName)
      );

      if (Object.keys(remainingDefinitions).length) {
        return {
          ...(rootDefinition as Record<string, unknown>),
          $defs: remainingDefinitions
        };
      }

      return rootDefinition as Record<string, unknown>;
    }
  }

  if (definitionMap) {
    return {
      ...rest,
      $defs: definitionMap
    };
  }

  return rest;
}

export const conciseOutputJsonSchema = normalizeJsonSchema(
  zodToJsonSchema(conciseOutputForModelSchema, "ConciseOutput")
);

export const learningOutputJsonSchema = normalizeJsonSchema(
  zodToJsonSchema(learningOutputForModelSchema, "LearningOutput")
);

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type ConciseOutput = z.infer<typeof conciseOutputSchema>;
export type LearningOutput = z.infer<typeof learningOutputSchema>;
