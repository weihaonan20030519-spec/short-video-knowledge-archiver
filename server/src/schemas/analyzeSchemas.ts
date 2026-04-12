import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  ANALYZE_MODES,
  APP_LANGUAGES,
  HIGHLIGHT_TONES,
  SOURCE_PLATFORMS,
  type AnalyzeRequest,
  type ConciseOutput,
  type LearningOutput
} from "../../../shared/src/analysis/analyzeContracts.js";

export const sourcePlatformSchema = z.enum(SOURCE_PLATFORMS);

export const analyzeModeSchema = z.enum(ANALYZE_MODES);
export const appLanguageSchema = z.enum(APP_LANGUAGES);
export const highlightToneSchema = z.enum(HIGHLIGHT_TONES);

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

const learningLegacyOutputForModelSchema = z.object({
  coreConclusion: z.string(),
  logicFramework: z.array(z.string()),
  keyDetails: z.array(z.string()),
  reusablePoints: z.array(z.string())
});

export const learningInternalOutputSchema = z.object({
  claimCore: z.string(),
  claimContrast: z.string().nullable().optional(),
  mechanismChain: z.array(z.string()),
  decisiveEvidence: z.array(z.string()),
  actionRules: z.array(z.string())
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
  zodToJsonSchema(learningInternalOutputSchema, "LearningInternalOutput")
);
export const learningInternalOutputJsonSchema = learningOutputJsonSchema;

export const learningLegacyOutputJsonSchema = normalizeJsonSchema(
  zodToJsonSchema(learningLegacyOutputForModelSchema, "LearningOutput")
);

export type { AnalyzeRequest, ConciseOutput, LearningOutput };
export type LearningInternalOutput = z.infer<typeof learningInternalOutputSchema>;
