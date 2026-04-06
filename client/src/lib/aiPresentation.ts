import type {
  AnalyzeMode,
  ConciseOutput,
  HighlightTone,
  LearningOutput,
  TextHighlight
} from "../types/domain";

export interface KnowledgeSection {
  key: string;
  title: string;
  items: string[];
  highlights: TextHighlight[];
  fallbackTone: HighlightTone;
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

function fallbackHighlights(items: string[], tone: HighlightTone) {
  const warnings = /注意|不要|避免|风险|限制|前提|条件|warning|risk|avoid|must|should not|be careful|unless|if\b/i;
  const semanticClause = /[^。！？!?；;\n]+[。！？!?；;]?/g;

  return items
    .slice(0, 4)
    .flatMap<TextHighlight>((item) => {
      const clauses = item.match(semanticClause)?.map((clause) => clause.trim()).filter(Boolean) || [];
      const warningClause = clauses.find((clause) => warnings.test(clause));

      if (warningClause) {
        return [{ text: warningClause, tone: "warning" }];
      }

      const bestClause = clauses.find((clause) => clause.length >= 10);
      if (!bestClause) {
        return [];
      }

      return [{ text: bestClause, tone }];
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
        items: summaryItems,
        highlights: dedupeHighlights([
          ...(concise.highlights?.summary || []),
          ...fallbackHighlights(summaryItems, "core")
        ]),
        fallbackTone: "core"
      },
      {
        key: "bullets",
        title: labels.bullets,
        items: bulletItems,
        highlights: dedupeHighlights([
          ...(concise.highlights?.bullets || []),
          ...fallbackHighlights(bulletItems, "action")
        ]),
        fallbackTone: "action"
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
      items: coreConclusion,
      highlights: dedupeHighlights([
        ...(learning.highlights?.coreConclusion || []),
        ...fallbackHighlights(coreConclusion, "core")
      ]),
      fallbackTone: "core"
    },
    {
      key: "logicFramework",
      title: labels.logicFramework,
      items: logicFramework,
      highlights: dedupeHighlights([
        ...(learning.highlights?.logicFramework || []),
        ...fallbackHighlights(logicFramework, "method")
      ]),
      fallbackTone: "method"
    },
    {
      key: "keyDetails",
      title: labels.keyDetails,
      items: keyDetails,
      highlights: dedupeHighlights([
        ...(learning.highlights?.keyDetails || []),
        ...fallbackHighlights(keyDetails, "warning")
      ]),
      fallbackTone: "warning"
    },
    {
      key: "reusablePoints",
      title: labels.reusablePoints,
      items: reusablePoints,
      highlights: dedupeHighlights([
        ...(learning.highlights?.reusablePoints || []),
        ...fallbackHighlights(reusablePoints, "action")
      ]),
      fallbackTone: "action"
    }
  ];

  return sections.filter((section) => section.items.length);
}
