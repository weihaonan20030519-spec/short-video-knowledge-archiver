import type { TextHighlight } from "../types/domain";

export interface HighlightSegment {
  text: string;
  tone: TextHighlight["tone"] | null;
}

const LEADING_OR_TRAILING_PUNCTUATION = /^[\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·]+|[\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·]+$/g;
const HARD_BOUNDARY = /[\n\r\t,，.。!！?？:：;；、()[\]{}<>《》“”‘’"'`]/;
const ENGLISH_WORD = /[A-Za-z0-9_-]/;
const CJK_CHAR = /[\u3400-\u9fff]/;
const SENTENCE_BOUNDARY = /[\n\r。.!！？?；;]/;
const SOFT_BOUNDARY = /[,，:：]/;
const WEAK_CONNECTOR_PATTERN =
  /^(例如|比如|譬如|因此|所以|然而|但是|尤其|说明|同时|另外|相比之下|for example|for instance|therefore|however|especially|which means)$/i;
const EXAMPLE_PATTERN = /(例如|比如|譬如|for example|for instance|such as|e\.g\.)/i;
const COMPARISON_PATTERN = /(相比之下|相比|比起|更|较|低于|高于|than\b|compared with|compared to|more than|less than|versus)/i;
const CONDITION_PATTERN = /(如果|若|当|在.+情况下|只有|unless|if\b|when\b|under\b)/i;
const WARNING_PATTERN = /(注意|不要|避免|风险|限制|前提|条件|warning|risk|avoid|must|should not|be careful|unless)/i;

function sanitizeCandidate(text: string) {
  return text.replace(LEADING_OR_TRAILING_PUNCTUATION, "").replace(/\s+/g, " ").trim();
}

function getCjkLength(text: string) {
  return Array.from(text).filter((char) => CJK_CHAR.test(char)).length;
}

function isMeaningfulCandidate(text: string) {
  if (!text) {
    return false;
  }

  if (WEAK_CONNECTOR_PATTERN.test(text)) {
    return false;
  }

  if (text.includes(" ")) {
    return text.length >= 8;
  }

  if (getCjkLength(text) > 0) {
    return getCjkLength(text) >= 4;
  }

  return text.length >= 4;
}

function isEnglishWordChar(char: string) {
  return ENGLISH_WORD.test(char);
}

function isBoundary(char: string) {
  return !char || /\s/.test(char) || HARD_BOUNDARY.test(char);
}

function isPhraseChar(char: string) {
  return Boolean(char) && !isBoundary(char);
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
  let left = start;
  let right = end;

  while (left > 0 && isPhraseChar(text[left - 1]) && start - left < 3) {
    left -= 1;
  }

  while (right < text.length && isPhraseChar(text[right]) && right - end < 8) {
    right += 1;
  }

  return { start: left, end: right };
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

function findBoundaryLeft(text: string, start: number, matcher: RegExp) {
  let index = start;

  while (index > 0 && !matcher.test(text[index - 1])) {
    index -= 1;
  }

  return index;
}

function findBoundaryRight(text: string, end: number, matcher: RegExp) {
  let index = end;

  while (index < text.length && !matcher.test(text[index])) {
    index += 1;
  }

  return index;
}

function trimRange(text: string, start: number, end: number) {
  const slice = text.slice(start, end);
  const trimmedStartOffset = slice.search(/[^\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·]/);
  const reversedMatch = slice.match(/[^\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·](?=[\s"'`“”‘’「」『』（）()【】\[\]{}<>《》,，.。!！?？:：;；、\-•·]*$)/);

  if (trimmedStartOffset === -1 || reversedMatch?.index === undefined) {
    return { start, end };
  }

  return {
    start: start + trimmedStartOffset,
    end: start + reversedMatch.index + 1
  };
}

function getInformationDensity(text: string) {
  const normalized = sanitizeCandidate(text);
  const contentOnly = normalized.replace(WEAK_CONNECTOR_PATTERN, "").replace(/\s+/g, "");

  if (!contentOnly) {
    return 0;
  }

  return contentOnly.length / Math.max(normalized.length, 1);
}

function isMeaningfulSpan(text: string) {
  const normalized = sanitizeCandidate(text);

  if (!normalized || WEAK_CONNECTOR_PATTERN.test(normalized)) {
    return false;
  }

  if (normalized.includes(" ")) {
    return normalized.length >= 10 && getInformationDensity(normalized) >= 0.55;
  }

  if (getCjkLength(normalized) > 0) {
    return getCjkLength(normalized) >= 5 && getInformationDensity(normalized) >= 0.65;
  }

  return normalized.length >= 6;
}

function chooseSemanticRange(text: string, start: number, end: number) {
  const expandedMatch = expandMatch(text, start, end);
  const sentenceStart = findBoundaryLeft(text, expandedMatch.start, SENTENCE_BOUNDARY);
  const sentenceBoundaryEnd = findBoundaryRight(text, expandedMatch.end, SENTENCE_BOUNDARY);
  const sentenceEnd =
    sentenceBoundaryEnd < text.length && SENTENCE_BOUNDARY.test(text[sentenceBoundaryEnd])
      ? sentenceBoundaryEnd + 1
      : sentenceBoundaryEnd;
  const segmentStart = findBoundaryLeft(text, expandedMatch.start, SOFT_BOUNDARY);
  const segmentEnd = findBoundaryRight(text, expandedMatch.end, SOFT_BOUNDARY);
  const sentenceRange = trimRange(text, sentenceStart, sentenceEnd);
  const segmentRange = trimRange(text, segmentStart, segmentEnd);
  const sentenceText = text.slice(sentenceRange.start, sentenceRange.end);
  const segmentText = text.slice(segmentRange.start, segmentRange.end);

  const shouldPreferSentence =
    EXAMPLE_PATTERN.test(sentenceText) ||
    COMPARISON_PATTERN.test(sentenceText) ||
    CONDITION_PATTERN.test(sentenceText) ||
    WARNING_PATTERN.test(sentenceText) ||
    !isMeaningfulSpan(segmentText);

  if (shouldPreferSentence && isMeaningfulSpan(sentenceText)) {
    return sentenceRange;
  }

  const expandedRange = trimRange(text, expandedMatch.start, expandedMatch.end);
  const expandedText = text.slice(expandedRange.start, expandedRange.end);

  if (
    segmentRange.start === sentenceRange.start &&
    segmentRange.end === sentenceRange.end &&
    isMeaningfulSpan(expandedText)
  ) {
    return expandedRange;
  }

  if (isMeaningfulSpan(segmentText)) {
    return segmentRange;
  }

  return expandedRange;
}

function scoreRange(text: string, start: number, end: number) {
  const slice = sanitizeCandidate(text.slice(start, end));
  const baseScore = slice.length;

  return (
    baseScore +
    (EXAMPLE_PATTERN.test(slice) ? 12 : 0) +
    (COMPARISON_PATTERN.test(slice) ? 10 : 0) +
    (CONDITION_PATTERN.test(slice) ? 10 : 0) +
    (WARNING_PATTERN.test(slice) ? 8 : 0)
  );
}

function findAllMatches(text: string, candidate: string) {
  const lowerText = text.toLowerCase();
  const lowerCandidate = candidate.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];

  let searchStart = 0;

  while (searchStart < text.length) {
    const start = lowerText.indexOf(lowerCandidate, searchStart);

    if (start === -1) {
      break;
    }

    const semanticRange = chooseSemanticRange(text, start, start + candidate.length);
    if (isMeaningfulSpan(text.slice(semanticRange.start, semanticRange.end))) {
      ranges.push(semanticRange);
    }
    searchStart = start + candidate.length;
  }

  return ranges;
}

function buildRanges(text: string, highlights: TextHighlight[]) {
  const candidates = highlights
    .map((highlight) => ({
      tone: highlight.tone,
      text: sanitizeCandidate(highlight.text)
    }))
    .filter((highlight) => isMeaningfulCandidate(highlight.text));

  const rawRanges = candidates.flatMap((candidate) =>
    findAllMatches(text, candidate.text).map((range) => ({
      ...range,
      tone: candidate.tone
    }))
  );

  const selected: Array<{ start: number; end: number; tone: TextHighlight["tone"] }> = [];

  for (const range of rawRanges.sort((left, right) => {
    const leftLength = scoreRange(text, left.start, left.end);
    const rightLength = scoreRange(text, right.start, right.end);

    if (rightLength !== leftLength) {
      return rightLength - leftLength;
    }

    return left.start - right.start;
  })) {
    const overlaps = selected.some(
      (existing) => !(range.end <= existing.start || range.start >= existing.end)
    );

    if (!overlaps) {
      selected.push(range);
    }
  }

  return selected.sort((left, right) => left.start - right.start);
}

export function splitTextWithHighlights(text: string, highlights: TextHighlight[]): HighlightSegment[] {
  const ranges = buildRanges(text, highlights);

  if (!ranges.length) {
    return [{ text, tone: null }];
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({
        text: text.slice(cursor, range.start),
        tone: null
      });
    }

    segments.push({
      text: text.slice(range.start, range.end),
      tone: range.tone
    });

    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      tone: null
    });
  }

  return segments.filter((segment) => segment.text);
}
