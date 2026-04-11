import type { AnalyzeRequest } from "../../../../shared/src/analysis/analyzeContracts.js";
import { normalizeAnalyzeRawText } from "./cache/cacheKeys.js";

export type AnalyzeAuditFlag =
  | "has_ocr_supplement"
  | "background_meta_heavy"
  | "example_or_list_heavy"
  | "ocr_dominates_input"
  | "body_too_short_after_partition";

export interface AnalyzeInputAudit {
  rawText: string;
  primaryBody: string;
  ocrSupplement: string | null;
  backgroundOrMeta: string[];
  possibleExamplesOrLists: string[];
  auditFlags: AnalyzeAuditFlag[];
}

const OCR_HEADING = "[图片文字补充]";
const SHORT_BODY_THRESHOLD = 60;
const BACKGROUND_HEAVY_RATIO = 0.28;
const EXAMPLE_HEAVY_RATIO = 0.3;
const DATE_PATTERN =
  /(?:\d{2,4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?|\d{1,2}\s*月\s*\d{1,2}\s*日|\d{4}-\d{2}-\d{2})/;
const URL_PATTERN = /https?:\/\/\S+/i;
const PLATFORM_PATTERN = /(小红书|xiaohongshu|bilibili|抖音|tiktok|微博|weibo)/i;
const REPORT_PATTERN = /(?:报告|白皮书|研究|论文|report)\s*[《“"]?/i;
const PROPAGATION_PATTERN = /(传播|刷屏|走红|爆火|热议|广泛传播|平台上|社交平台)/i;
const HISTORY_EVENT_PATTERN = /(首次提出|提出|命名|发布|发布报告|联合创始人)/i;
const META_LABEL_PATTERN =
  /^(?:来源|原文|链接|平台|作者|发布时间|题目|标题|报告题目|报告标题|命名来源|发布信息)[:：]/i;
const EXAMPLE_PATTERN =
  /(?:例如|比如|譬如|包括|可分为|分为|分成|常见问题包括|常见问题有|一是|二是|三是|首先|其次|最后|第一|第二|第三|1[\.、]|2[\.、]|3[\.、])/i;
const ENUMERATION_PREFIX_PATTERN = /^(?:\(?\d+\)?[\.、]|[一二三四五六七八九十]+[、.])/;

function splitSentences(text: string) {
  return (
    text.match(/[^。！？!?；;]+[。！？!?；;]?/g) || []
  )
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitOcrSupplement(rawText: string) {
  const markerIndex = rawText.indexOf(OCR_HEADING);

  if (markerIndex === -1) {
    return {
      bodyText: rawText,
      ocrSupplement: null
    };
  }

  const bodyText = rawText.slice(0, markerIndex).trim();
  const ocrSupplement = rawText.slice(markerIndex + OCR_HEADING.length).trim() || null;

  return {
    bodyText: bodyText || rawText,
    ocrSupplement
  };
}

function countListSeparators(text: string) {
  return (text.match(/[、，,]/g) || []).length;
}

function isBackgroundOrMetaSentence(sentence: string) {
  const normalized = sentence.trim();

  if (!normalized) {
    return false;
  }

  return (
    META_LABEL_PATTERN.test(normalized) ||
    URL_PATTERN.test(normalized) ||
    (DATE_PATTERN.test(normalized) && (PLATFORM_PATTERN.test(normalized) || REPORT_PATTERN.test(normalized))) ||
    (DATE_PATTERN.test(normalized) && HISTORY_EVENT_PATTERN.test(normalized)) ||
    (REPORT_PATTERN.test(normalized) && PROPAGATION_PATTERN.test(normalized)) ||
    (PLATFORM_PATTERN.test(normalized) && PROPAGATION_PATTERN.test(normalized))
  );
}

function isPossibleExampleOrListSentence(sentence: string) {
  const normalized = sentence.trim();

  if (!normalized) {
    return false;
  }

  return (
    EXAMPLE_PATTERN.test(normalized) ||
    ENUMERATION_PREFIX_PATTERN.test(normalized) ||
    (countListSeparators(normalized) >= 4 && /[:：]/.test(normalized))
  );
}

function buildPrimaryBody(
  bodyText: string,
  backgroundOrMeta: string[],
  possibleExamplesOrLists: string[]
) {
  const bodySentences = splitSentences(bodyText);
  const backgroundSet = new Set(backgroundOrMeta);
  const exampleSet = new Set(possibleExamplesOrLists);
  const retained = bodySentences.filter(
    (sentence) => !backgroundSet.has(sentence) && !exampleSet.has(sentence)
  );

  if (retained.length === bodySentences.length) {
    return bodyText.trim();
  }

  return (retained.join(" ").trim() || bodyText.trim());
}

function sumTextLength(values: string[]) {
  return values.reduce((total, value) => total + value.length, 0);
}

export function buildAnalyzeInputAudit(
  input: Pick<AnalyzeRequest, "rawText">
): AnalyzeInputAudit {
  const rawText = normalizeAnalyzeRawText(input.rawText);
  const { bodyText, ocrSupplement } = splitOcrSupplement(rawText);
  const bodySentences = splitSentences(bodyText);
  const backgroundOrMeta = bodySentences.filter(isBackgroundOrMetaSentence);
  const possibleExamplesOrLists = bodySentences.filter(
    (sentence) =>
      !backgroundOrMeta.includes(sentence) &&
      isPossibleExampleOrListSentence(sentence)
  );
  const primaryBody = buildPrimaryBody(bodyText, backgroundOrMeta, possibleExamplesOrLists);
  const flags: AnalyzeAuditFlag[] = [];
  const backgroundLength = sumTextLength(backgroundOrMeta);
  const exampleLength = sumTextLength(possibleExamplesOrLists);

  if (ocrSupplement) {
    flags.push("has_ocr_supplement");
  }

  if (rawText.length > 0 && backgroundLength / rawText.length >= BACKGROUND_HEAVY_RATIO) {
    flags.push("background_meta_heavy");
  }

  if (
    possibleExamplesOrLists.length > 0 &&
    (exampleLength / Math.max(bodyText.length, 1) >= EXAMPLE_HEAVY_RATIO ||
      possibleExamplesOrLists.length >= 1)
  ) {
    flags.push("example_or_list_heavy");
  }

  if (ocrSupplement && ocrSupplement.length > primaryBody.length) {
    flags.push("ocr_dominates_input");
  }

  if (primaryBody.length < SHORT_BODY_THRESHOLD) {
    flags.push("body_too_short_after_partition");
  }

  return {
    rawText,
    primaryBody,
    ocrSupplement,
    backgroundOrMeta,
    possibleExamplesOrLists,
    auditFlags: flags
  };
}

export function summarizeAnalyzeInputAudit(audit: AnalyzeInputAudit) {
  return {
    rawTextLength: audit.rawText.length,
    primaryBodyLength: audit.primaryBody.length,
    ocrSupplementLength: audit.ocrSupplement?.length ?? 0,
    backgroundMetaCount: audit.backgroundOrMeta.length,
    exampleOrListCount: audit.possibleExamplesOrLists.length,
    auditFlags: audit.auditFlags,
    primaryBodyPreview: audit.primaryBody.slice(0, 180),
    backgroundOrMetaPreview: audit.backgroundOrMeta.slice(0, 2),
    exampleOrListPreview: audit.possibleExamplesOrLists.slice(0, 2)
  };
}
