import type { HighlightTone, TextHighlight } from "../types/domain";

export type HighlightPriority = "primary" | "secondary";

export interface RenderableHighlight {
  text: string;
  priority: HighlightPriority;
}

export interface HighlightSegment {
  text: string;
  priority: HighlightPriority | null;
}

const LEADING_OR_TRAILING_PUNCTUATION =
  /^[\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·]+|[\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·]+$/g;
const ENGLISH_WORD = /[A-Za-z0-9_-]/;
const CJK_CHAR = /[\u3400-\u9fff]/;
const WEAK_CONNECTOR_PATTERN =
  /^(例如|比如|譬如|因此|所以|然而|但是|尤其|说明|同时|另外|相比之下|for example|for instance|therefore|however|especially|which means)$/i;
const WARNING_PATTERN =
  /(注意|不要|避免|风险|限制|前提|条件|warning|risk|avoid|must|should not|be careful|unless)/i;
const METHOD_PATTERN =
  /(先|再|拆|定义|建立|梳理|设计|步骤|方法|框架|define|map|build|design|framework|step|steps)/i;
const ACTION_PATTERN =
  /(执行|动作|检查|补充|复盘|写出|决定|推进|行动|use|turn|write|check|ship|apply|act)/i;
const JUDGMENT_PATTERN =
  /(关键|核心|更稳|更高|更低|结论|重点|本质|值得|有效|结论|key|core|better|worse|effective|critical)/i;
const CAUSAL_PATTERN =
  /(因为|由于|所以|因此|导致|意味着|说明|如果|就|而是|instead|because|so|therefore|which means|if|then|rather than)/i;
const STANCE_PATTERN =
  /(认为|指出|强调|批评|支持|反对|质疑|主张|提醒|warn|argue|note|critic|support|oppose|claim|suggest)/i;
const CHANGE_PATTERN =
  /(转向|变化|不在.+而在|从.+到|shift|change|pivot|move from)/i;
const ATTRIBUTION_SHELL_END_PATTERN =
  /(?:认为|指出|强调|批评|称|表示|主张|提醒|warn|argue|note|critic|support|oppose|claim|suggest)$/i;
const SOURCE_GROUP_PATTERN =
  /(支持者|反对者|盟友|观察人士|分析人士|评论人士|官员|团队|阵营|followers|supporters|critics|officials)$/i;
const FRAMING_SHELL_PATTERN =
  /^(在[^，。；！？!?]{0,24}(?:中|下)|如果[^，。；！？!?]{0,28}|尽管[^，。；！？!?]{0,28}|当[^，。；！？!?]{0,24}时|面对[^，。；！？!?]{0,24}时|对于[^，。；！？!?]{0,24}(?:而言|来说)?)/i;
const LOW_SIGNAL_STANDALONE_PATTERN =
  /^(主持人|嘉宾|专家|作者|博主|up主|UP主|老师|学者|主播|记者|评论员|人物|角色|身份|someone|speaker|host|guest|expert|author|teacher)$/i;
const MAX_HIGHLIGHTS_PER_ITEM = 2;
const MAX_CJK_HIGHLIGHT_LENGTH = 16;
const MAX_LATIN_HIGHLIGHT_LENGTH = 42;
const MAX_ITEM_COVERAGE_RATIO = 0.68;
const MIN_FALLBACK_SIGNAL_SCORE = 8;

function sanitizeCandidate(text: string) {
  return text.replace(LEADING_OR_TRAILING_PUNCTUATION, "").replace(/\s+/g, " ").trim();
}

function getCjkLength(text: string) {
  return Array.from(text).filter((char) => CJK_CHAR.test(char)).length;
}

function isEnglishWordChar(char: string) {
  return ENGLISH_WORD.test(char);
}

function expandEnglishWordBoundaries(text: string, start: number, end: number) {
  let left = start;
  let right = end;

  while (left > 0 && isEnglishWordChar(text[left - 1])) {
    left -= 1;
  }

  while (right < text.length && isEnglishWordChar(text[right])) {
    right += 1;
  }

  return { start: left, end: right };
}

function expandCjkPhrase(text: string, start: number, end: number) {
  return { start, end };
}

function expandMatch(text: string, start: number, end: number) {
  const matchedText = text.slice(start, end);

  if (/[A-Za-z]/.test(matchedText)) {
    return expandEnglishWordBoundaries(text, start, end);
  }

  if (getCjkLength(matchedText) > 0) {
    return expandCjkPhrase(text, start, end);
  }

  return { start, end };
}

function trimRange(text: string, start: number, end: number) {
  const slice = text.slice(start, end);
  const trimmedStartOffset = slice.search(
    /[^\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·]/
  );
  const reversedMatch = slice.match(
    /[^\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·](?=[\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·]*$)/
  );

  if (trimmedStartOffset === -1 || reversedMatch?.index === undefined) {
    return { start, end };
  }

  return {
    start: start + trimmedStartOffset,
    end: start + reversedMatch.index + 1
  };
}

function isMeaningfulCandidate(text: string) {
  if (!text || WEAK_CONNECTOR_PATTERN.test(text)) {
    return false;
  }

  if (text.includes(" ")) {
    return text.length >= 8;
  }

  const cjkLength = getCjkLength(text);
  if (cjkLength > 0) {
    return cjkLength >= 3;
  }

  return text.length >= 5;
}

function coversTooMuchOfItem(itemText: string, candidateText: string) {
  const normalizedItem = sanitizeCandidate(itemText);
  const normalizedCandidate = sanitizeCandidate(candidateText);

  if (!normalizedItem || !normalizedCandidate) {
    return true;
  }

  if (normalizedCandidate === normalizedItem) {
    return true;
  }

  return normalizedCandidate.length / normalizedItem.length >= MAX_ITEM_COVERAGE_RATIO;
}

function exceedsHighlightLength(text: string) {
  const cjkLength = getCjkLength(text);

  if (cjkLength > 0) {
    return cjkLength > MAX_CJK_HIGHLIGHT_LENGTH;
  }

  return text.length > MAX_LATIN_HIGHLIGHT_LENGTH;
}

function isRenderableCandidate(itemText: string, candidateText: string) {
  const normalized = sanitizeCandidate(candidateText);

  return (
    isMeaningfulCandidate(normalized) &&
    !exceedsHighlightLength(normalized) &&
    !coversTooMuchOfItem(itemText, normalized)
  );
}

function isLowSignalStandaloneCandidate(text: string) {
  const normalized = sanitizeCandidate(text);

  if (!normalized) {
    return true;
  }

  return LOW_SIGNAL_STANDALONE_PATTERN.test(normalized);
}

function isAttributionShellCandidate(text: string) {
  const normalized = sanitizeCandidate(text);

  if (!normalized) {
    return false;
  }

  return ATTRIBUTION_SHELL_END_PATTERN.test(normalized) || SOURCE_GROUP_PATTERN.test(normalized);
}

function isFramingShellCandidate(text: string) {
  const normalized = sanitizeCandidate(text);

  if (!normalized) {
    return false;
  }

  return FRAMING_SHELL_PATTERN.test(normalized);
}

function isAttributionLikeShellCandidate(text: string) {
  const normalized = sanitizeCandidate(text);

  if (!normalized) {
    return true;
  }

  return (
    isLowSignalStandaloneCandidate(normalized) ||
    isAttributionShellCandidate(normalized)
  );
}

function isStructuralShellCandidate(text: string) {
  const normalized = sanitizeCandidate(text);

  if (!normalized) {
    return true;
  }

  return isAttributionLikeShellCandidate(normalized) || isFramingShellCandidate(normalized);
}

function splitCandidateIntoPhrases(candidateText: string) {
  return candidateText
    .split(/[\n\r,，.。!！?？:：;；、]/g)
    .map((part) => sanitizeCandidate(part))
    .filter(Boolean);
}

function deriveCandidateVariants(candidateText: string) {
  const normalized = sanitizeCandidate(candidateText);

  if (!normalized) {
    return [];
  }

  const attributionTailMatch = normalized.match(
    /(?:认为|指出|强调|批评|称|表示|主张|提醒|warn|argue|note|critic|support|oppose|claim|suggest)(.+)$/i
  );
  const attributionTail = attributionTailMatch ? sanitizeCandidate(attributionTailMatch[1] || "") : "";
  const claimTailMatch = normalized.match(
    /(?:问题在于|关键在于|核心在于|本质在于|风险在于|重点在于)(.+)$/i
  );
  const claimTail = claimTailMatch ? sanitizeCandidate(claimTailMatch[1] || "") : "";

  const variants = [
    normalized,
    ...splitCandidateIntoPhrases(normalized),
    ...(attributionTail ? [attributionTail, ...splitCandidateIntoPhrases(attributionTail)] : []),
    ...(claimTail ? [claimTail, ...splitCandidateIntoPhrases(claimTail)] : [])
  ];
  const unique = new Set<string>();

  return variants.filter((item) => {
    const key = item.toLowerCase();
    if (!item || unique.has(key)) {
      return false;
    }

    unique.add(key);
    return true;
  });
}

function scoreCandidate(text: string, fallbackTone?: HighlightTone) {
  const normalized = sanitizeCandidate(text);
  const cjkLength = getCjkLength(normalized);
  const lengthScore = Math.min(normalized.length, 18);
  const warningBoost = WARNING_PATTERN.test(normalized) ? 6 : 0;
  const methodBoost = METHOD_PATTERN.test(normalized) ? 4 : 0;
  const actionBoost = ACTION_PATTERN.test(normalized) ? 4 : 0;
  const judgmentBoost = JUDGMENT_PATTERN.test(normalized) ? 3 : 0;
  const causalBoost = CAUSAL_PATTERN.test(normalized) ? 5 : 0;
  const stanceBoost = STANCE_PATTERN.test(normalized) ? 5 : 0;
  const changeBoost = CHANGE_PATTERN.test(normalized) ? 4 : 0;
  const standalonePenalty = isLowSignalStandaloneCandidate(normalized) ? 10 : 0;
  const attributionPenalty = isAttributionShellCandidate(normalized) ? 8 : 0;
  const framingPenalty = isFramingShellCandidate(normalized) ? 7 : 0;
  const toneBoost =
    fallbackTone === "warning"
      ? warningBoost
      : fallbackTone === "method"
        ? methodBoost
        : fallbackTone === "action"
          ? actionBoost
          : judgmentBoost;

  return (
    lengthScore +
    toneBoost +
    causalBoost +
    stanceBoost +
    changeBoost +
    (cjkLength > 0 ? 2 : 0) -
    standalonePenalty -
    attributionPenalty -
    framingPenalty
  );
}

function hasStrongInterpretiveSignal(text: string) {
  return (
    WARNING_PATTERN.test(text) ||
    METHOD_PATTERN.test(text) ||
    ACTION_PATTERN.test(text) ||
    JUDGMENT_PATTERN.test(text) ||
    CAUSAL_PATTERN.test(text) ||
    STANCE_PATTERN.test(text) ||
    CHANGE_PATTERN.test(text)
  );
}

function isFallbackEligibleCandidate(itemText: string, candidateText: string, fallbackTone: HighlightTone) {
  const normalized = sanitizeCandidate(candidateText);

  if (!isRenderableCandidate(itemText, normalized) || isLowSignalStandaloneCandidate(normalized)) {
    return false;
  }

  const cjkLength = getCjkLength(normalized);
  const hasInterpretiveSignal = hasStrongInterpretiveSignal(normalized);
  const hasSubstantiveLength =
    normalized.includes(" ") ? normalized.length >= 10 : cjkLength >= 5 || normalized.length >= 8;

  return hasInterpretiveSignal || (hasSubstantiveLength && scoreCandidate(normalized, fallbackTone) >= MIN_FALLBACK_SIGNAL_SCORE);
}

function findRange(text: string, candidate: string) {
  const lowerText = text.toLowerCase();
  const lowerCandidate = candidate.toLowerCase();
  const start = lowerText.indexOf(lowerCandidate);

  if (start === -1) {
    return null;
  }

  const expandedRange = expandMatch(text, start, start + candidate.length);
  const trimmedRange = trimRange(text, expandedRange.start, expandedRange.end);
  const trimmedText = sanitizeCandidate(text.slice(trimmedRange.start, trimmedRange.end));

  if (!isRenderableCandidate(text, trimmedText)) {
    return null;
  }

  return {
    start: trimmedRange.start,
    end: trimmedRange.end,
    text: trimmedText
  };
}

function buildCandidatePool(
  itemText: string,
  highlights: TextHighlight[],
  fallbackTone?: HighlightTone
) {
  const derived = highlights.flatMap((highlight) => deriveCandidateVariants(highlight.text));
  const seen = new Set<string>();

  const scoredCandidates = derived
    .filter((candidate) => {
      const key = candidate.toLowerCase();
      if (seen.has(key) || !isRenderableCandidate(itemText, candidate) || isLowSignalStandaloneCandidate(candidate)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((candidate) => ({
      candidate,
      shell: isStructuralShellCandidate(candidate),
      score: scoreCandidate(candidate, fallbackTone)
    }));

  const hasNonShellCandidate = scoredCandidates.some((item) => !item.shell);
  const filteredCandidates = hasNonShellCandidate
    ? scoredCandidates.filter((item) => !item.shell)
    : scoredCandidates;

  return filteredCandidates
    .sort((left, right) => right.score - left.score)
    .map((item) => item.candidate);
}

export function extractFallbackHighlightCandidates(itemText: string, fallbackTone: HighlightTone) {
  const phrases = deriveCandidateVariants(itemText)
    .filter((candidate) => isFallbackEligibleCandidate(itemText, candidate, fallbackTone))
    .map((candidate) => ({
      candidate,
      shell: isStructuralShellCandidate(candidate),
      score: scoreCandidate(candidate, fallbackTone)
    }));

  const hasNonShellCandidate = phrases.some((item) => !item.shell);
  const filteredPhrases = hasNonShellCandidate ? phrases.filter((item) => !item.shell) : phrases;

  const unique = new Set<string>();

  return filteredPhrases
    .sort((left, right) => right.score - left.score)
    .map((item) => item.candidate)
    .filter((candidate) => {
      const key = candidate.toLowerCase();
      if (unique.has(key)) {
        return false;
      }

      unique.add(key);
      return true;
    });
}

export function normalizeHighlightsForItem(
  itemText: string,
  highlights: TextHighlight[],
  fallbackTone?: HighlightTone
): RenderableHighlight[] {
  const candidatePool = buildCandidatePool(itemText, highlights, fallbackTone);
  const selected: Array<{ start: number; end: number; text: string }> = [];

  for (const candidate of candidatePool) {
    const range = findRange(itemText, candidate);

    if (!range) {
      continue;
    }

    const isDuplicate = selected.some((existing) => {
      const overlaps = !(range.end <= existing.start || range.start >= existing.end);
      const sameText = existing.text.toLowerCase() === range.text.toLowerCase();
      const nearDuplicate =
        existing.text.toLowerCase().includes(range.text.toLowerCase()) ||
        range.text.toLowerCase().includes(existing.text.toLowerCase());

      return overlaps || sameText || nearDuplicate;
    });

    if (isDuplicate) {
      continue;
    }

    selected.push(range);

    if (selected.length >= MAX_HIGHLIGHTS_PER_ITEM) {
      break;
    }
  }

  return selected
    .map((range, index) => ({
      start: range.start,
      text: range.text,
      priority: (index === 0 ? "primary" : "secondary") as HighlightPriority
    }))
    .sort((left, right) => left.start - right.start)
    .map(({ text, priority }) => ({
      text,
      priority
    }));
}

function buildRanges(text: string, highlights: RenderableHighlight[]) {
  const selected: Array<{ start: number; end: number; priority: HighlightPriority }> = [];

  for (const highlight of highlights) {
    const range = findRange(text, highlight.text);

    if (!range) {
      continue;
    }

    const overlaps = selected.some(
      (existing) => !(range.end <= existing.start || range.start >= existing.end)
    );

    if (overlaps) {
      continue;
    }

    selected.push({
      start: range.start,
      end: range.end,
      priority: highlight.priority
    });
  }

  return selected.sort((left, right) => left.start - right.start);
}

export function splitTextWithHighlights(
  text: string,
  highlights: RenderableHighlight[]
): HighlightSegment[] {
  const ranges = buildRanges(text, highlights);

  if (!ranges.length) {
    return [{ text, priority: null }];
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({
        text: text.slice(cursor, range.start),
        priority: null
      });
    }

    segments.push({
      text: text.slice(range.start, range.end),
      priority: range.priority
    });

    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      priority: null
    });
  }

  return segments.filter((segment) => segment.text);
}
