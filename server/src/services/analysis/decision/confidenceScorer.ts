import type { AnalyzeRequest } from "../../../../../shared/src/analysis/analyzeContracts.js";

export type AnalyzeSufficiency = "insufficient" | "borderline" | "sufficient";
export type AnalyzeAmbiguity = "low" | "medium" | "high";
export type AnalyzeLocalityFit = "not_applicable" | "weak" | "strong";

export interface AnalyzeDecisionSignals {
  sufficiency: AnalyzeSufficiency;
  ambiguity: AnalyzeAmbiguity;
  localityFit: AnalyzeLocalityFit;
}

function countMatches(input: string, pattern: RegExp) {
  return (input.match(pattern) || []).length;
}

function countSentenceBoundaries(rawText: string) {
  const boundaries = countMatches(rawText, /[。！？!?\.]+/g);
  return boundaries > 0 ? boundaries : 1;
}

function countStructureMarkers(rawText: string) {
  return countMatches(rawText, /[:：;；、,，]/g);
}

function resolveSufficiency(input: AnalyzeRequest, textLength: number, sentenceBoundaries: number): AnalyzeSufficiency {
  if (input.mode === "learning") {
    if (textLength < 45) {
      return "insufficient";
    }

    if (textLength < 90 || sentenceBoundaries < 2) {
      return "borderline";
    }

    return "sufficient";
  }

  if (textLength < 45) {
    return "insufficient";
  }

  if (textLength < 70) {
    return "borderline";
  }

  return "sufficient";
}

function resolveAmbiguity(
  hasTitle: boolean,
  textLength: number,
  sentenceBoundaries: number,
  structureMarkers: number
): AnalyzeAmbiguity {
  if (!hasTitle && textLength < 80 && sentenceBoundaries <= 1) {
    return "high";
  }

  if (!hasTitle || sentenceBoundaries <= 1 || structureMarkers === 0) {
    return "medium";
  }

  return "low";
}

function resolveLocalityFit(
  input: AnalyzeRequest,
  textLength: number,
  ambiguity: AnalyzeAmbiguity,
  sentenceBoundaries: number
): AnalyzeLocalityFit {
  if (input.mode === "learning") {
    return "not_applicable";
  }

  if (textLength <= 220 && ambiguity !== "high" && sentenceBoundaries >= 2) {
    return "strong";
  }

  return "weak";
}

export function scoreAnalyzeDecisionSignals(input: AnalyzeRequest): AnalyzeDecisionSignals {
  const textLength = input.rawText.length;
  const sentenceBoundaries = countSentenceBoundaries(input.rawText);
  const structureMarkers = countStructureMarkers(input.rawText);
  const hasTitle = Boolean(input.title?.trim());

  const sufficiency = resolveSufficiency(input, textLength, sentenceBoundaries);
  const ambiguity = resolveAmbiguity(hasTitle, textLength, sentenceBoundaries, structureMarkers);
  const localityFit = resolveLocalityFit(input, textLength, ambiguity, sentenceBoundaries);

  return {
    sufficiency,
    ambiguity,
    localityFit
  };
}
