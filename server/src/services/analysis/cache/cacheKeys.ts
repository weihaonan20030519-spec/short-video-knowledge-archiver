import { createHash } from "node:crypto";

import type {
  AnalyzeMode,
  AppLanguage,
  SourcePlatform
} from "../../../../../shared/src/analysis/analyzeContracts.js";

function buildHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function normalizeAnalyzeRawText(rawText: string) {
  return rawText.replace(/\s+/g, " ").trim();
}

export function buildContentHash(rawText: string) {
  return buildHash({
    rawText: normalizeAnalyzeRawText(rawText)
  });
}

export function buildDecisionContextHash(input: {
  mode: AnalyzeMode;
  sourcePlatform: SourcePlatform;
  policyVersion: string;
  decisionVersion: string;
}) {
  return buildHash({
    mode: input.mode,
    sourcePlatform: input.sourcePlatform,
    policyVersion: input.policyVersion,
    decisionVersion: input.decisionVersion
  });
}

export function buildModelContextHash(input: {
  mode: AnalyzeMode;
  appLanguage: AppLanguage;
  title?: string;
  sourcePlatform: SourcePlatform;
  originalUrl: string | null;
  provider: string;
  model: string;
  promptVersion: string;
}) {
  return buildHash({
    mode: input.mode,
    appLanguage: input.appLanguage,
    title: input.title?.trim() || "",
    sourcePlatform: input.sourcePlatform,
    originalUrl: input.originalUrl,
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion
  });
}

export function buildPresentationHash(input: {
  mode: AnalyzeMode;
  appLanguage: AppLanguage;
  presentationVersion: string;
}) {
  return buildHash({
    mode: input.mode,
    appLanguage: input.appLanguage,
    presentationVersion: input.presentationVersion
  });
}
