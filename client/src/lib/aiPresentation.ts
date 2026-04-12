import type {
  AnalyzeMode,
  ConciseOutput,
  HighlightTone,
  LearningOutput,
  TextHighlight
} from "../types/domain";
import {
  decideHighlightRenderMode,
  type EmphasisSpan,
  type FallbackEmphasis,
  type HighlightSectionKey,
  type HighlightRenderMode,
  type QuoteHighlight
} from "./highlight";

export interface KnowledgeSectionItem {
  sentence: string;
  mode: HighlightRenderMode;
  quoteHighlight: QuoteHighlight | null;
  emphasisSpans: EmphasisSpan[];
  fallbackEmphasis: FallbackEmphasis | null;
  coverageFallback: FallbackEmphasis | null;
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
  fallbackTone: HighlightTone,
  sectionKey: HighlightSectionKey
): KnowledgeSectionItem[] {
  const normalizedRawHighlights = dedupeHighlights(rawHighlights);

  const preliminaryItems = items.map((item) => {
    return {
      sentence: item,
      ...decideHighlightRenderMode(item, normalizedRawHighlights, fallbackTone, sectionKey)
    };
  });

  let signalDrought = 0;

  return preliminaryItems.map((item) => {
    const hasPrimarySignal = Boolean(
      item.quoteHighlight || item.emphasisSpans.length > 0 || item.fallbackEmphasis
    );

    if (hasPrimarySignal) {
      signalDrought = 0;
      return item;
    }

    signalDrought += 1;

    if (signalDrought >= 2 && item.coverageFallback) {
      signalDrought = 0;

      return {
        ...item,
        mode: "emphasis" as const,
        fallbackEmphasis: item.coverageFallback
      };
    }

    return item;
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
        items: buildSectionItems(summaryItems, concise.highlights?.summary || [], "core", "summary")
      },
      {
        key: "bullets",
        title: labels.bullets,
        items: buildSectionItems(bulletItems, concise.highlights?.bullets || [], "action", "bullets")
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
      items: buildSectionItems(coreConclusion, learning.highlights?.coreConclusion || [], "core", "coreConclusion")
    },
    {
      key: "logicFramework",
      title: labels.logicFramework,
      items: buildSectionItems(logicFramework, learning.highlights?.logicFramework || [], "method", "logicFramework")
    },
    {
      key: "keyDetails",
      title: labels.keyDetails,
      items: buildSectionItems(keyDetails, learning.highlights?.keyDetails || [], "warning", "keyDetails")
    },
    {
      key: "reusablePoints",
      title: labels.reusablePoints,
      items: buildSectionItems(reusablePoints, learning.highlights?.reusablePoints || [], "action", "reusablePoints")
    }
  ];

  return sections.filter((section) => section.items.length);
}
