import type {
  AnalyzeMode,
  ConciseOutput,
  HighlightTone,
  LearningOutput,
  TextHighlight
} from "../types/domain";
import {
  extractFallbackHighlightCandidates,
  normalizeHighlightsForItem,
  type RenderableHighlight
} from "./highlight";

export interface KnowledgeSectionItem {
  text: string;
  highlights: RenderableHighlight[];
}

export interface KnowledgeSection {
  key: string;
  title: string;
  items: KnowledgeSectionItem[];
}

function splitOnSentence(text: string) {
  return text
    .split(/(?:\n+|(?<=[。！？!?;；])\s*)/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeFieldItems(value: string | string[]) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  const normalized = value.trim();

  if (!normalized) {
    return [];
  }

  const splitByLines = normalized
    .split(/\n+|(?:^|\s)[-•·]\s+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  if (splitByLines.length > 1) {
    return splitByLines;
  }

  const splitBySentences = splitOnSentence(normalized);
  return splitBySentences.length > 1 ? splitBySentences : [normalized];
}

function dedupeHighlights(highlights: TextHighlight[]) {
  const seen = new Set<string>();

  return highlights.filter((item) => {
    const key = `${item.tone}:${item.text.toLowerCase()}`;
    if (!item.text.trim() || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildSectionItems(
  items: string[],
  rawHighlights: TextHighlight[],
  fallbackTone: HighlightTone
): KnowledgeSectionItem[] {
  const normalizedRawHighlights = dedupeHighlights(rawHighlights);

  return items.map((item) => {
    const candidates =
      normalizedRawHighlights.length > 0
        ? normalizedRawHighlights
        : extractFallbackHighlightCandidates(item, fallbackTone).map((text) => ({
            text,
            tone: fallbackTone
          }));

    return {
      text: item,
      highlights: normalizeHighlightsForItem(item, candidates, fallbackTone)
    };
  });
}

export function buildKnowledgeSections(
  mode: AnalyzeMode,
  result: ConciseOutput | LearningOutput,
  labels: {
    summary: string;
    bullets: string;
    coreConclusion: string;
    logicFramework: string;
    keyDetails: string;
    reusablePoints: string;
  }
): KnowledgeSection[] {
  if (mode === "concise") {
    const concise = result as ConciseOutput;
    const summaryItems = normalizeFieldItems(concise.summary);
    const bulletItems = normalizeFieldItems(concise.bullets);

    const sections: KnowledgeSection[] = [
      {
        key: "summary",
        title: labels.summary,
        items: buildSectionItems(summaryItems, concise.highlights?.summary || [], "core")
      },
      {
        key: "bullets",
        title: labels.bullets,
        items: buildSectionItems(bulletItems, concise.highlights?.bullets || [], "action")
      }
    ];

    return sections.filter((section) => section.items.length);
  }

  const learning = result as LearningOutput;
  const logicFramework = normalizeFieldItems(learning.logicFramework);
  const keyDetails = normalizeFieldItems(learning.keyDetails);
  const reusablePoints = normalizeFieldItems(learning.reusablePoints);
  const coreConclusion = normalizeFieldItems(learning.coreConclusion);

  const sections: KnowledgeSection[] = [
    {
      key: "coreConclusion",
      title: labels.coreConclusion,
      items: buildSectionItems(coreConclusion, learning.highlights?.coreConclusion || [], "core")
    },
    {
      key: "logicFramework",
      title: labels.logicFramework,
      items: buildSectionItems(logicFramework, learning.highlights?.logicFramework || [], "method")
    },
    {
      key: "keyDetails",
      title: labels.keyDetails,
      items: buildSectionItems(keyDetails, learning.highlights?.keyDetails || [], "warning")
    },
    {
      key: "reusablePoints",
      title: labels.reusablePoints,
      items: buildSectionItems(reusablePoints, learning.highlights?.reusablePoints || [], "action")
    }
  ];

  return sections.filter((section) => section.items.length);
}
