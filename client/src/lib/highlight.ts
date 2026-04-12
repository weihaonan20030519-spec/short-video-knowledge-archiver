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

export interface EmphasisSpan {
  text: string;
  tone: HighlightTone;
}

export interface EmphasisSegment {
  text: string;
  tone: HighlightTone | null;
}

export interface QuoteHighlight {
  text: string;
  tone: HighlightTone;
}

export interface FallbackEmphasis {
  text: string;
  tone: HighlightTone;
}

export type HighlightSectionKey =
  | "summary"
  | "bullets"
  | "coreConclusion"
  | "logicFramework"
  | "keyDetails"
  | "reusablePoints";

export type HighlightRenderMode = "quote" | "emphasis" | "none";

export interface SentenceHighlightPresentation {
  mode: HighlightRenderMode;
  quoteHighlight: QuoteHighlight | null;
  emphasisSpans: EmphasisSpan[];
  fallbackEmphasis: FallbackEmphasis | null;
  coverageFallback: FallbackEmphasis | null;
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
const TOPIC_SHELL_PATTERN =
  /^(?:面向[^，。；！？!?]{0,28}时|构建[^，。；！？!?]{0,28}(?:时|中)?|替代[^，。；！？!?]{0,28}(?:验证|测算)|运行依赖[^，。；！？!?]{0,28}|处理[^，。；！？!?]{0,28}时|部署[^，。；！？!?]{0,24}时|当设备[^，。；！？!?]{0,28}时|围绕[^，。；！？!?]{0,24}|关于[^，。；！？!?]{0,24}|针对[^，。；！？!?]{0,24})/i;
const LOW_SIGNAL_STANDALONE_PATTERN =
  /^(主持人|嘉宾|专家|作者|博主|up主|UP主|老师|学者|主播|记者|评论员|人物|角色|身份|someone|speaker|host|guest|expert|author|teacher)$/i;
const DATE_ONLY_PATTERN =
  /^(?:\d{2,4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?|\d{1,2}\s*月\s*\d{1,2}\s*日|\d{4}-\d{2}-\d{2}|\d{4}\/\d{2}\/\d{2})$/;
const META_LABEL_PATTERN =
  /(正确用法|正确使用方法|核心问题|内部实验战绩|实际效果|传播节点|历史节点|报告标题|报告题目|命名史信息|辅助重点)$/i;
const GOVERNOR_PATTERN =
  /(?:核心)?(?:问题|例子|案例|结果|证据|实验结果|方法|做法|路径|原因|风险|表现|结论|要点)(?:在于|包括|体现为|例如|如|有|为|是|显示)?$/i;
const EVIDENCE_INTRO_PATTERN =
  /(?:实验显示|实验表明|内部实验显示|案例显示|数据显示|数据表明|研究显示|研究发现|显示|表明|发现)/i;
const EVIDENCE_RESULT_PATTERN =
  /(提升|提高|下降|减少|增加|翻倍|约\d+(?:\.\d+)?倍|效率|成功率|准确率|错误率|节省|缩短|改善|加快|更快|更高|更低)/i;
const NUMERIC_FRAGMENT_PATTERN =
  /^(?:约?\d+(?:\.\d+)?(?:[-–]\d+(?:\.\d+)?)?(?:倍|%|名|人|天|小时|分钟|个|项)?|\d+(?:\.\d+)?\s*(?:engineers?|people|users?|times?))$/i;
const PAIR_DELIMITERS: Array<[string, string]> = [
  ["《", "》"],
  ["（", "）"],
  ["(", ")"],
  ["“", "”"],
  ["‘", "’"],
  ['"', '"'],
  ["'", "'"]
];
const MAX_HIGHLIGHTS_PER_ITEM = 2;
const MAX_CJK_HIGHLIGHT_LENGTH = 16;
const MAX_LATIN_HIGHLIGHT_LENGTH = 42;
const MAX_ITEM_COVERAGE_RATIO = 0.68;
const MIN_FALLBACK_SIGNAL_SCORE = 8;
const MAX_QUOTE_CJK_LENGTH = 24;
const MAX_QUOTE_LATIN_LENGTH = 56;
const MIN_QUOTE_CJK_LENGTH = 6;
const MIN_QUOTE_LATIN_LENGTH = 12;
const MAX_QUOTE_COVERAGE_RATIO = 0.58;
const MAX_FALLBACK_CJK_LENGTH = 24;
const MAX_FALLBACK_LATIN_LENGTH = 48;
const MAX_INLINE_CJK_LENGTH = 10;
const MAX_INLINE_LATIN_LENGTH = 20;
const EMPHASIS_SUMMARY_SEPARATOR = " · ";
const CORE_CONCLUSION_PATTERN =
  /(而是[^，。；！？!?]{3,24}|而非[^，。；！？!?]{3,24}|而不是[^，。；！？!?]{3,24}|而在于[^，。；！？!?]{3,24}|(?:关键|核心|本质|重点|核心价值)(?:在于|是)[^，。；！？!?]{3,28}|应作为[^，。；！？!?]{3,18})/i;
const LOGIC_FRAMEWORK_PATTERN =
  /(?:导致|依赖|要求|驱动|构成|形成|实现|决定|提供|划定|支撑|意味着|闭环|协同|容错|验证|转向)/i;
const KEY_DETAIL_EVIDENCE_PATTERN =
  /(?:提升|提高|下降|减少|增加|效率|稳定性|成功率|错误率|限制|前提|条件|差异|对比|关注点是|关键目标是|关键在于|整合为|不是[^，。；！？!?]{0,16}而是)/i;
const MECHANISM_NODE_PATTERN =
  /(?:尺寸分层(?:与运行框架封装)?|多尺寸架构(?:（[^）]+）)?(?:与Ollama自动适配机制)?|Ollama自动适配机制|自动适配机制|运行框架封装|去中心化交付链|三重刚性需求驱动|路径依赖惯性|分阶段强约束|验证即交付|本地输入|系统级稳定性|零数据出域|零服务依赖|零排队延迟)/i;
const LOW_SIGNAL_DETAIL_TAIL_PATTERN = /^(?:差异|关键差异|关键|指标|目标|结论)$/i;
const REUSABLE_ACTION_PATTERN =
  /(?:优先|先|应|应该|需|需要|要|必须|避免|建立|定义|设计|识别|区分|设置|执行|校验|评估|拆分|梳理|预设|嵌入|转向|聚焦|显式|作为|补充|使用|禁用|安装|加载|下载|运行|pull|run)/i;
const REUSABLE_OBJECT_PATTERN =
  /(指标|反馈|约束|流程|规则|边界|职责|路径|条件|降级|校验|监控|步骤|目标|输入|输出|上下文|系统|层|模板|字段|机制|断点|角色|结构|闭环|标准|目录|百科全书|模型|版本|命令|运行模式|联网AI服务|联网服务|下载|安装|加载|内存容量|本地运行模式|pull|run|禁用)/i;
const REUSABLE_RULE_PATTERN =
  /(?:为首要判据|输入即本地|验证即交付|拆解为[^，。；！？!?]{2,18}原子单元|铁律|测算|封装|分层|首要判据|原子单元)/i;
const BACKGROUND_SHELL_PATTERN =
  /(报告|发布时间|发布|提出|首次提出|命名|命名史|来源|平台|社交平台|传播|刷屏|走红|小红书|OpenAI|HashiCorp|报告《|《[^》]+》)/i;
const CASE_SPECIFIC_PATTERN =
  /(AGENTS\.md|Harness|Codex|OpenAI|HashiCorp|Gemini|Qwen|小红书|Bilibili|TikTok|微博)/i;
const ABSTRACT_LOGIC_SLOGAN_PATTERN =
  /^(?:系统性|工程化|整体性|结构化|抽象层级|方法论)(?:[^，。；！？!?]{0,12})(?:能力|目标|要求|价值)$/i;
const CORE_NAVIGATION_PATTERN =
  /(系统|闭环|判断|定义|目标|风险|问题|机制|结构|约束|反馈|原则|误区|信号|边界|回路|稳定性)/i;
const CONNECTOR_FRAGMENT_PATTERN = /^(?:与|和|及|并|以及|同|及其)[^，。；！？!?]{1,24}$/i;
const VALUE_CLUSTER_PATTERN =
  /(?:(?:零数据出域|零服务依赖|零排队延迟)(?:、(?:零数据出域|零服务依赖|零排队延迟)){1,3}|(?:完全免费|数据保留本地|断网可用|无服务器排队)(?:、(?:完全免费|数据保留本地|断网可用|无服务器排队)){1,3})/i;
const THRESHOLD_RULE_SEGMENT_PATTERN =
  /(?:(?:当)?(?:设备)?(?:内存)?\s*(?:为|达到|≥|>=)?\s*\d+\s*GB[^，。；！？!?]{0,24})/gi;
const STEP_SEQUENCE_PATTERN = /(?:先|再|最后|然后|随后|接着)[^，。；！？!?]{2,48}/g;
const CONTRAST_MARKER_PATTERN =
  /(?:而不是|而非|不是|并非|而在于|但|却|然而|可是|不过|只是|只有|才)/i;

const LEARNING_SECTION_KEYS: HighlightSectionKey[] = [
  "coreConclusion",
  "logicFramework",
  "keyDetails",
  "reusablePoints"
];

interface HighlightCandidateSeed {
  candidate: string;
  tone: HighlightTone;
  score: number;
  source: "explicit" | "fallback";
}

interface ExtractedHighlightCandidate {
  start: number;
  end: number;
  text: string;
  normalized: string;
  tone: HighlightTone;
  score: number;
  source: "explicit" | "fallback";
}

function sanitizeCandidate(text: string) {
  return text.replace(LEADING_OR_TRAILING_PUNCTUATION, "").replace(/\s+/g, " ").trim();
}

function getCjkLength(text: string) {
  return Array.from(text).filter((char) => CJK_CHAR.test(char)).length;
}

function getApproxDisplayLength(text: string) {
  return Array.from(text).reduce((total, char) => {
    if (CJK_CHAR.test(char)) {
      return total + 1;
    }

    if (/[A-Za-z0-9]/.test(char)) {
      return total + 0.55;
    }

    return total + 0.75;
  }, 0);
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

function countMatches(text: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  return [...text.matchAll(matcher)].length;
}

function isFrameworkSentence(text: string) {
  const hasFrameLead = /(?:框架|支柱|组成|分为|包括|有以下|三大|四类|步骤|原则)/.test(text);
  const hasColon = /[:：]/.test(text);
  const parallelSeparators = countMatches(text, /[、]/g);
  const parentheticalGroups = countMatches(text, /[（(][^）)]{1,80}[）)]/g);

  return (hasColon && (parallelSeparators >= 1 || parentheticalGroups >= 2)) || (hasFrameLead && parallelSeparators >= 2);
}

function isDateLikeCandidate(text: string) {
  return DATE_ONLY_PATTERN.test(sanitizeCandidate(text));
}

function isMetaLabelCandidate(text: string) {
  return META_LABEL_PATTERN.test(sanitizeCandidate(text));
}

function isTitleOnlyCandidate(text: string) {
  const normalized = sanitizeCandidate(text);

  return (
    /^《[^》]+》$/.test(normalized) ||
    /^[「『][^」』]+[」』]$/.test(normalized) ||
    /^report\b/i.test(normalized)
  );
}

function breaksMixedScriptToken(itemText: string, start: number, end: number) {
  const currentStart = itemText[start] || "";
  const before = itemText[start - 1] || "";
  const after = itemText[end] || "";
  const currentEnd = itemText[end - 1] || "";

  return (
    (/[A-Za-z]/.test(currentStart) && before === ".") ||
    (/[A-Za-z]/.test(currentEnd) && after === ".")
  );
}

function isNumericLikeCandidate(text: string) {
  return NUMERIC_FRAGMENT_PATTERN.test(sanitizeCandidate(text));
}

function findClauseStart(text: string, index: number) {
  let cursor = index - 1;

  while (cursor >= 0) {
    if (/[。！？!?；;\n]/.test(text[cursor])) {
      return cursor + 1;
    }

    cursor -= 1;
  }

  return 0;
}

function findClauseEnd(text: string, index: number) {
  let cursor = index;

  while (cursor < text.length) {
    if (/[。！？!?；;\n]/.test(text[cursor])) {
      return cursor;
    }

    cursor += 1;
  }

  return text.length;
}

function hasBrokenPairBoundary(text: string) {
  return PAIR_DELIMITERS.some(([open, close]) => {
    const openCount = countMatches(text, new RegExp(open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
    const closeCount = open === close
      ? openCount
      : countMatches(text, new RegExp(close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));

    if (open === close) {
      return openCount % 2 !== 0;
    }

    return openCount !== closeCount;
  });
}

function isWrappedByClosedPair(text: string) {
  return PAIR_DELIMITERS.some(([open, close]) => text.startsWith(open) && text.endsWith(close));
}

function expandRangeToClosedPairs(text: string, start: number, end: number) {
  let nextStart = start;
  let nextEnd = end;

  for (const [open, close] of PAIR_DELIMITERS) {
    const openIndex = text.lastIndexOf(open, nextStart - 1);
    const closeIndex = text.indexOf(close, nextEnd);

    if (openIndex !== -1 && closeIndex !== -1 && openIndex < nextStart && closeIndex >= nextEnd) {
      nextStart = openIndex;
      nextEnd = closeIndex + close.length;
    }
  }

  return { start: nextStart, end: nextEnd };
}

function expandRangeToGovernor(text: string, start: number, end: number) {
  const fragment = text.slice(start, end);

  if (!/[、，,]/.test(fragment)) {
    return { start, end };
  }

  const clauseStart = findClauseStart(text, start);
  const prefix = text.slice(clauseStart, start).trim();
  const governorMatch = prefix.match(GOVERNOR_PATTERN);

  if (!governorMatch || governorMatch.index === undefined) {
    return { start, end };
  }

  return {
    start: clauseStart + governorMatch.index,
    end
  };
}

function findEmphasisRange(text: string, candidate: string) {
  const lowerText = text.toLowerCase();
  const lowerCandidate = candidate.toLowerCase();
  const start = lowerText.indexOf(lowerCandidate);

  if (start === -1) {
    return null;
  }

  const expandedRange = expandMatch(text, start, start + candidate.length);
  const trimmedRange = trimRange(text, expandedRange.start, expandedRange.end);
  const pairClosedRange = expandRangeToClosedPairs(text, trimmedRange.start, trimmedRange.end);
  const governorClosedRange = expandRangeToGovernor(text, pairClosedRange.start, pairClosedRange.end);
  const rawText = text.slice(governorClosedRange.start, governorClosedRange.end);
  const normalized = sanitizeCandidate(rawText);
  const passesRenderability = isWrappedByClosedPair(rawText)
    ? isMeaningfulCandidate(normalized) && !exceedsHighlightLength(normalized)
    : isRenderableCandidate(text, normalized);

  if (!passesRenderability || hasBrokenPairBoundary(rawText)) {
    return null;
  }

  return {
    start: governorClosedRange.start,
    end: governorClosedRange.end,
    text: rawText,
    normalized
  };
}

function isSafeEmphasisRange(
  itemText: string,
  range: { start: number; end: number; text: string; normalized?: string }
) {
  const normalized = range.normalized ?? sanitizeCandidate(range.text);

  if (!normalized) {
    return false;
  }

  if (
    (!isWrappedByClosedPair(range.text) && coversTooMuchOfItem(itemText, normalized)) ||
    isStructuralShellCandidate(normalized) ||
    isDateLikeCandidate(normalized) ||
    isNumericLikeCandidate(normalized) ||
    isMetaLabelCandidate(normalized) ||
    isTitleOnlyCandidate(normalized) ||
    hasBrokenPairBoundary(range.text) ||
    breaksMixedScriptToken(itemText, range.start, range.end)
  ) {
    return false;
  }

  return true;
}

function isStructuralShellCandidate(text: string) {
  const normalized = sanitizeCandidate(text);

  if (!normalized) {
    return true;
  }

  return (
    isAttributionLikeShellCandidate(normalized) ||
    isFramingShellCandidate(normalized) ||
    TOPIC_SHELL_PATTERN.test(normalized) ||
    CONNECTOR_FRAGMENT_PATTERN.test(normalized)
  );
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

function buildEmphasisCandidatePool(
  itemText: string,
  highlights: TextHighlight[],
  fallbackTone: HighlightTone,
  sectionKey?: HighlightSectionKey
): HighlightCandidateSeed[] {
  const explicitCandidates = highlights.flatMap((highlight) => {
    const normalizedHighlight = sanitizeCandidate(highlight.text);

    if (!normalizedHighlight || normalizedHighlight === sanitizeCandidate(itemText)) {
      return [];
    }

    return deriveCandidateVariants(highlight.text).map((candidate) => ({
      candidate,
      tone: highlight.tone,
      source: "explicit" as const
    }));
  });
  const sectionCandidateTexts = sectionKey ? buildSectionNavigationCandidates(itemText, sectionKey) : [];
  const sectionCandidateKeySet = new Set(sectionCandidateTexts.map((candidate) => candidate.toLowerCase()));
  const sectionCandidates = sectionCandidateTexts.map((candidate) => ({
    candidate,
    tone: fallbackTone,
    source: "fallback" as const
  }));
  const fallbackCandidates = extractFallbackHighlightCandidates(itemText, fallbackTone).map((candidate) => ({
    candidate,
    tone: fallbackTone,
    source: "fallback" as const
  }));
  const candidates =
    explicitCandidates.length > 0
      ? [...explicitCandidates, ...sectionCandidates, ...fallbackCandidates]
      : [...sectionCandidates, ...fallbackCandidates];
  const deduped = new Map<
    string,
    { candidate: string; tone: HighlightTone; score: number; source: "explicit" | "fallback" }
  >();

  for (const entry of candidates) {
    const candidate = sanitizeCandidate(entry.candidate);

    if (
      !candidate ||
      (entry.source === "fallback" && !isRenderableCandidate(itemText, candidate)) ||
      (entry.source === "explicit" && !isMeaningfulCandidate(candidate)) ||
      isLowSignalStandaloneCandidate(candidate) ||
      isStructuralShellCandidate(candidate) ||
      (!sectionCandidateKeySet.has(candidate.toLowerCase()) && !isUsefulSectionCandidate(candidate, sectionKey))
    ) {
      continue;
    }

    const score =
      scoreCandidate(candidate, entry.tone) +
      (entry.source === "explicit" ? 1 : 0) +
      (sectionCandidateKeySet.has(candidate.toLowerCase()) ? 6 : 0);
    const key = candidate.toLowerCase();
    const existing = deduped.get(key);

    if (
      !existing ||
      score > existing.score ||
      (score === existing.score && entry.source === "explicit" && existing.source === "fallback")
    ) {
      deduped.set(key, {
        candidate,
        tone: entry.tone,
        score,
        source: entry.source
      });
    }
  }

  return [...deduped.values()].sort((left, right) => right.score - left.score);
}

function extractHighlightCandidates(
  itemText: string,
  highlights: TextHighlight[],
  fallbackTone: HighlightTone,
  sectionKey?: HighlightSectionKey
): ExtractedHighlightCandidate[] {
  const candidatePool = buildEmphasisCandidatePool(itemText, highlights, fallbackTone, sectionKey);
  const extracted: ExtractedHighlightCandidate[] = [];

  for (const entry of candidatePool) {
    const range = findEmphasisRange(itemText, entry.candidate);

    if (!range || !isSafeEmphasisRange(itemText, range)) {
      continue;
    }

    const isDuplicate = extracted.some((existing) => {
      const overlaps = !(range.end <= existing.start || range.start >= existing.end);
      const sameText = existing.normalized.toLowerCase() === range.normalized.toLowerCase();
      const nearDuplicate =
        existing.normalized.toLowerCase().includes(range.normalized.toLowerCase()) ||
        range.normalized.toLowerCase().includes(existing.normalized.toLowerCase());

      return overlaps || sameText || nearDuplicate;
    });

    if (isDuplicate) {
      continue;
    }

    extracted.push({
      start: range.start,
      end: range.end,
      text: range.text,
      normalized: range.normalized,
      tone: entry.tone,
      score: entry.score,
      source: entry.source
    });
  }

  return extracted.sort((left, right) => right.score - left.score || left.start - right.start);
}

function fitsQuoteLength(text: string) {
  const approxDisplayLength = getApproxDisplayLength(text);

  if (getCjkLength(text) > 0) {
    return approxDisplayLength >= MIN_QUOTE_CJK_LENGTH && approxDisplayLength <= MAX_QUOTE_CJK_LENGTH;
  }

  return approxDisplayLength >= MIN_QUOTE_LATIN_LENGTH / 2 && approxDisplayLength <= MAX_QUOTE_LATIN_LENGTH / 2;
}

function fitsFallbackLength(text: string) {
  const approxDisplayLength = getApproxDisplayLength(text);

  if (getCjkLength(text) > 0) {
    return approxDisplayLength <= MAX_FALLBACK_CJK_LENGTH;
  }

  return approxDisplayLength <= MAX_FALLBACK_LATIN_LENGTH / 2;
}

function fitsInlineLength(text: string) {
  const approxDisplayLength = getApproxDisplayLength(text);

  if (getCjkLength(text) > 0) {
    return approxDisplayLength <= MAX_INLINE_CJK_LENGTH;
  }

  return approxDisplayLength <= MAX_INLINE_LATIN_LENGTH / 2;
}

function fitsSectionInlineLength(text: string, sectionKey?: HighlightSectionKey) {
  if (!sectionKey || !LEARNING_SECTION_KEYS.includes(sectionKey)) {
    return fitsInlineLength(text);
  }

  const approxDisplayLength = getApproxDisplayLength(text);

  if (sectionKey === "logicFramework" && /(架构|机制|驱动|封装|适配)/.test(text)) {
    if (getCjkLength(text) > 0) {
      return approxDisplayLength <= MAX_INLINE_CJK_LENGTH + 10;
    }

    return approxDisplayLength <= MAX_INLINE_LATIN_LENGTH / 2 + 10;
  }

  if (getCjkLength(text) > 0) {
    return approxDisplayLength <= MAX_INLINE_CJK_LENGTH + 4;
  }

  return approxDisplayLength <= MAX_INLINE_LATIN_LENGTH / 2 + 6;
}

function isInlineFriendlyCandidate(
  candidate: ExtractedHighlightCandidate,
  sectionKey?: HighlightSectionKey
) {
  return (
    fitsSectionInlineLength(candidate.normalized, sectionKey) &&
    !/[《》“”"'（）()]/.test(candidate.text) &&
    countMatches(candidate.text, /[、，,:：;；]/g) <= 1
  );
}

function validateQuoteHighlight(
  itemText: string,
  candidate: ExtractedHighlightCandidate
): QuoteHighlight | null {
  const normalizedItem = sanitizeCandidate(itemText);

  if (!normalizedItem) {
    return null;
  }

  if (
    candidate.source !== "explicit" ||
    !fitsQuoteLength(candidate.normalized) ||
    candidate.normalized.length / normalizedItem.length >= MAX_QUOTE_COVERAGE_RATIO ||
    isNumericLikeCandidate(candidate.normalized) ||
    isDateLikeCandidate(candidate.normalized) ||
    isMetaLabelCandidate(candidate.normalized) ||
    isTitleOnlyCandidate(candidate.normalized) ||
    isStructuralShellCandidate(candidate.normalized) ||
    countMatches(candidate.text, /[、，,:：;；]/g) > 2
  ) {
    return null;
  }

  return {
    text: candidate.text,
    tone: candidate.tone
  };
}

function chooseQuoteHighlight(
  itemText: string,
  candidates: ExtractedHighlightCandidate[],
  highlightCount: number,
  sectionKey?: HighlightSectionKey
): QuoteHighlight | null {
  if (highlightCount !== 1) {
    return null;
  }

  for (const candidate of candidates) {
    const competingInlineCandidate = candidates.some(
      (other) => other !== candidate && isInlineFriendlyCandidate(other, sectionKey)
    );
    const wrappedCandidate = isWrappedByClosedPair(candidate.text);

    if (!wrappedCandidate && (isInlineFriendlyCandidate(candidate, sectionKey) || competingInlineCandidate)) {
      continue;
    }

    const quoteHighlight = validateQuoteHighlight(itemText, candidate);

    if (quoteHighlight) {
      return quoteHighlight;
    }
  }

  return null;
}

function isFragmentedForInline(
  itemText: string,
  ranges: Array<{ start: number; end: number }>,
  highlightCount: number
) {
  if (highlightCount > 2 || ranges.length > 2) {
    return true;
  }

  if (ranges.length <= 1) {
    return false;
  }

  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const current = ranges[index];
    const gapText = itemText.slice(previous.end, current.start);

    if (gapText.length > 18 || /[、:：;；《》“”"'（）()]/.test(gapText)) {
      return true;
    }
  }

  return false;
}

function selectInlineEmphasisSpans(
  itemText: string,
  candidates: ExtractedHighlightCandidate[],
  highlightCount: number,
  sectionKey?: HighlightSectionKey
): EmphasisSpan[] {
  const selected: ExtractedHighlightCandidate[] = [];
  const maxHighlights =
    sectionKey && LEARNING_SECTION_KEYS.includes(sectionKey) ? 1 : MAX_HIGHLIGHTS_PER_ITEM;

  for (const candidate of candidates) {
    if (!isInlineFriendlyCandidate(candidate, sectionKey)) {
      continue;
    }

    const isDuplicate = selected.some((existing) => {
      const overlaps = !(candidate.end <= existing.start || candidate.start >= existing.end);
      const sameText = existing.normalized.toLowerCase() === candidate.normalized.toLowerCase();
      const nearDuplicate =
        existing.normalized.toLowerCase().includes(candidate.normalized.toLowerCase()) ||
        candidate.normalized.toLowerCase().includes(existing.normalized.toLowerCase());

      return overlaps || sameText || nearDuplicate;
    });

    if (isDuplicate) {
      continue;
    }

    selected.push(candidate);

    if (selected.length >= maxHighlights) {
      break;
    }
  }

  const sortedSelected = selected.sort((left, right) => left.start - right.start);

  if (isFragmentedForInline(itemText, sortedSelected, highlightCount)) {
    return [];
  }

  return sortedSelected.map(({ text, tone }) => ({
    text,
    tone
  }));
}

function buildCompactEmphasis(
  parts: string[],
  tone: HighlightTone
): FallbackEmphasis | null {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const normalized = sanitizeCandidate(part);

    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }

    seen.add(normalized.toLowerCase());
    unique.push(normalized);
  }

  if (!unique.length) {
    return null;
  }

  let candidateText = "";

  for (const part of unique.slice(0, 3)) {
    const nextText = candidateText ? `${candidateText}${EMPHASIS_SUMMARY_SEPARATOR}${part}` : part;

    if (!fitsFallbackLength(nextText)) {
      if (!candidateText && fitsFallbackLength(part)) {
        candidateText = part;
      }

      break;
    }

    candidateText = nextText;
  }

  if (!candidateText) {
    return null;
  }

  return {
    text: candidateText,
    tone
  };
}

function joinSemanticParts(prefix: string, suffix: string) {
  if (!prefix) {
    return suffix;
  }

  if (!suffix) {
    return prefix;
  }

  const needsSpace = /[A-Za-z0-9]/.test(suffix[0] || "") && !/[:：]$/.test(prefix);
  return `${prefix}${needsSpace ? " " : ""}${suffix}`;
}

function extractNamedConcept(itemText: string) {
  const patterns = [
    { pattern: /AGENTS\.md/g, boost: 18 },
    {
      pattern: /(?:Harness|Prompt|Context|Codex|MBTI)(?:\s*(?:工程|标签|标签化|假说|机制|框架|协议|方法))?/gi,
      boost: 14
    },
    { pattern: /Agent\s*(?:漂移|工程|机制|框架)/gi, boost: 12 },
    {
      pattern: /[\u4e00-\u9fffA-Za-z0-9_.-]{2,18}(?:工程|标签化?|假说|机制|框架|协议|方法)/g,
      boost: 10
    },
    { pattern: /(?:OpenAI|HashiCorp|Anthropic|Google|Gemini|Qwen)\b/gi, boost: 4 }
  ] as const;
  const matches = new Map<string, { text: string; score: number }>();

  for (const { pattern, boost } of patterns) {
    for (const rawMatch of itemText.match(pattern) || []) {
      const match = sanitizeCandidate(rawMatch);

      if (!match || isDateLikeCandidate(match) || isTitleOnlyCandidate(match)) {
        continue;
      }

      const score =
        boost +
        (/(?:工程|标签|标签化|假说|机制|框架|协议|方法|漂移)/.test(match) ? 10 : 0) +
        (match === "AGENTS.md" ? 8 : 0) +
        match.length;

      const key = match.toLowerCase();
      const existing = matches.get(key);

      if (!existing || score > existing.score) {
        matches.set(key, {
          text: match,
          score
        });
      }
    }
  }

  return [...matches.entries()]
    .sort((left, right) => right[1].score - left[1].score)
    .map(([, value]) => value.text)
    .at(0) ?? null;
}

function buildEvidenceEmphasisFallback(
  itemText: string,
  highlights: TextHighlight[],
  candidates: ExtractedHighlightCandidate[],
  fallbackTone: HighlightTone
): FallbackEmphasis | null {
  if (!EVIDENCE_INTRO_PATTERN.test(itemText) || !EVIDENCE_RESULT_PATTERN.test(itemText)) {
    return null;
  }
  const hasEvidenceFragment =
    highlights.length === 0 ||
    highlights.some((highlight) => {
      const normalized = sanitizeCandidate(highlight.text);

      return (
        isNumericLikeCandidate(normalized) ||
        isDateLikeCandidate(normalized) ||
        /(?:实验|研究|报告|数据显示|内部实验)/i.test(normalized)
      );
    });

  if (!hasEvidenceFragment) {
    return null;
  }

  const subjectMatch = itemText.match(
    /\d+(?:\.\d+)?(?:[-–]\d+(?:\.\d+)?)?\s*(?:名|位)?(?:工程师|研究员|成员|用户|人|engineers?|people|users?)/i
  );
  const resultMatch = itemText.match(
    /(?:整体)?(?:效率|成功率|准确率|错误率|成本|速度)?(?:提升|提高|下降|减少|增加|翻倍|节省|缩短|改善|加快|更快|更高|更低)[^，。；！？!?]{0,10}/i
  );
  const normalizedResult = sanitizeCandidate(
    (resultMatch?.[0] || "")
      .replace(/^整体/, "")
      .replace(/^效率提升/, "效率")
      .replace(/^成功率提升/, "成功率")
      .replace(/^准确率提升/, "准确率")
      .replace(/^错误率下降/, "错误率下降")
  );
  const methodCandidate =
    candidates.find((candidate) => /(?:Harness|工程|框架|系统|Agent|Codex|MBTI|标签)/i.test(candidate.text))
      ?.text || extractNamedConcept(itemText);

  return buildCompactEmphasis(
    [subjectMatch?.[0] || "", methodCandidate || "", normalizedResult],
    fallbackTone
  );
}

function compactGovernorLabel(governor: string) {
  const normalized = sanitizeCandidate(governor);
  const head = normalized.match(/(?:问题|例子|案例|结果|证据|实验结果|方法|做法|路径|原因|风险|表现|结论|要点)/)?.[0];

  if (!head) {
    return normalized;
  }

  return `${head}：`;
}

function buildGovernorEmphasisFallback(
  itemText: string,
  candidates: ExtractedHighlightCandidate[],
  fallbackTone: HighlightTone
): FallbackEmphasis | null {
  const governedCandidate = candidates.find(
    (candidate) =>
      /(?:问题|例子|案例|结果|证据|实验结果|方法|做法|路径|原因|风险|表现|结论|要点)/.test(candidate.text) &&
      /[、，,]/.test(candidate.text)
  );

  if (
    governedCandidate &&
    fitsFallbackLength(governedCandidate.text) &&
    !coversTooMuchOfItem(itemText, governedCandidate.text)
  ) {
    return {
      text: governedCandidate.text,
      tone: governedCandidate.tone
    };
  }

  const clause = sanitizeCandidate(itemText);
  const governorMatch = clause.match(
    /^([^，。！？!?；;]{0,10}(?:问题|例子|案例|结果|证据|实验结果|方法|做法|路径|原因|风险|表现|结论|要点)(?:在于|包括|体现为|例如|如|有|为|是)?)(.*)$/i
  );

  if (!governorMatch) {
    return null;
  }

  const governor = sanitizeCandidate(governorMatch[1] || "");
  const remainder = sanitizeCandidate(governorMatch[2] || "");

  if (!governor || !remainder) {
    return null;
  }

  const hasListStructure = /[、，,和]/.test(remainder);

  if (!hasListStructure) {
    const candidateText = sanitizeCandidate(joinSemanticParts(governor, remainder));

    if (!coversTooMuchOfItem(itemText, candidateText) && fitsFallbackLength(candidateText)) {
      return {
        text: candidateText,
        tone: fallbackTone
      };
    }

    return null;
  }

  const items = remainder
    .split(/[、，,]|和/g)
    .map((item) => sanitizeCandidate(item))
    .filter((item) => item && !isMetaLabelCandidate(item));

  if (!items.length) {
    return null;
  }

  const compactGovernor = compactGovernorLabel(governor);
  const summaryRemainder = items[0] || "";

  if (!summaryRemainder) {
    return null;
  }

  return {
    text: fitsFallbackLength(joinSemanticParts(governor, summaryRemainder))
      ? joinSemanticParts(governor, summaryRemainder)
      : joinSemanticParts(compactGovernor, summaryRemainder),
    tone: fallbackTone
  };
}

function buildFragmentSummaryFallback(
  candidates: ExtractedHighlightCandidate[],
  fallbackTone: HighlightTone
): FallbackEmphasis | null {
  return buildCompactEmphasis(
    candidates
      .slice()
      .sort((left, right) => left.start - right.start)
      .filter((candidate) => fitsFallbackLength(candidate.text))
      .map((candidate) => candidate.text),
    fallbackTone
  );
}

function buildCoverageEmphasisFallback(
  itemText: string,
  candidates: ExtractedHighlightCandidate[],
  fallbackTone: HighlightTone
): FallbackEmphasis | null {
  const namedConcept = extractNamedConcept(itemText);

  if (namedConcept) {
    const conceptEmphasis = buildCompactEmphasis([namedConcept], fallbackTone);

    if (conceptEmphasis) {
      return conceptEmphasis;
    }
  }

  const candidateSummary = buildCompactEmphasis(
    candidates
      .slice()
      .sort((left, right) => left.start - right.start)
      .filter((candidate) => !isNumericLikeCandidate(candidate.normalized))
      .map((candidate) => candidate.text),
    fallbackTone
  );

  if (candidateSummary) {
    return candidateSummary;
  }

  return buildCompactEmphasis(extractFallbackHighlightCandidates(itemText, fallbackTone), fallbackTone);
}

function buildEmphasisFallback(
  itemText: string,
  highlights: TextHighlight[],
  candidates: ExtractedHighlightCandidate[],
  fallbackTone: HighlightTone,
  sectionKey?: HighlightSectionKey
): FallbackEmphasis | null {
  if (sectionKey === "reusablePoints") {
    const thresholdRuleFallbackText = buildThresholdRuleFallbackText(itemText);

    if (thresholdRuleFallbackText) {
      return {
        text: thresholdRuleFallbackText,
        tone: fallbackTone
      };
    }

    const orderedStepFallbackText = buildOrderedStepFallbackText(itemText);

    if (orderedStepFallbackText) {
      return {
        text: orderedStepFallbackText,
        tone: fallbackTone
      };
    }

    const orderedStepMatches = extractStepSequenceClauses(itemText)
      .map((clause) => sanitizeCandidate(clause))
      .filter(Boolean);

    if (orderedStepMatches.length > 1) {
      const orderedStepFallback = buildCompactEmphasis(orderedStepMatches.slice(0, 3), fallbackTone);

      if (orderedStepFallback) {
        return orderedStepFallback;
      }
    }

    const actionAnchors = candidates.filter(
      (candidate) =>
        REUSABLE_ACTION_PATTERN.test(candidate.normalized) &&
        REUSABLE_OBJECT_PATTERN.test(candidate.normalized) &&
        !CASE_SPECIFIC_PATTERN.test(candidate.normalized)
    );

    if (actionAnchors.length > 1) {
      const compactActionFallback = buildCompactEmphasis(
        actionAnchors
          .slice()
          .sort((left, right) => left.start - right.start)
          .map((candidate) => normalizeActionRuleClause(candidate.text))
          .slice(0, 2),
        fallbackTone
      );

      if (compactActionFallback) {
        return compactActionFallback;
      }
    }

    const actionAnchor = actionAnchors[0];

    if (actionAnchor) {
      return {
        text: normalizeActionRuleClause(actionAnchor.text),
        tone: actionAnchor.tone
      };
    }
  }

  return (
    buildEvidenceEmphasisFallback(itemText, highlights, candidates, fallbackTone) ||
    buildGovernorEmphasisFallback(itemText, candidates, fallbackTone) ||
    buildFragmentSummaryFallback(candidates, fallbackTone)
  );
}

export function decideHighlightRenderMode(
  itemText: string,
  highlights: TextHighlight[],
  fallbackTone: HighlightTone,
  sectionKey?: HighlightSectionKey
): SentenceHighlightPresentation {
  const sectionPrimaryAnchor =
    sectionKey && LEARNING_SECTION_KEYS.includes(sectionKey)
      ? pickSectionInlineAnchor(itemText, sectionKey, fallbackTone)
      : null;
  const sectionFallback =
    sectionKey && LEARNING_SECTION_KEYS.includes(sectionKey)
      ? pickSectionFallbackEmphasis(itemText, fallbackTone, sectionKey)
      : null;
  const candidates = extractHighlightCandidates(itemText, highlights, fallbackTone, sectionKey);
  const coverageFallback = buildCoverageEmphasisFallback(itemText, candidates, fallbackTone);

  if (sectionPrimaryAnchor) {
    return {
      mode: "emphasis",
      quoteHighlight: null,
      emphasisSpans: [sectionPrimaryAnchor],
      fallbackEmphasis: null,
      coverageFallback
    };
  }

  if (sectionFallback) {
    return {
      mode: "emphasis",
      quoteHighlight: null,
      emphasisSpans: [],
      fallbackEmphasis: sectionFallback,
      coverageFallback
    };
  }

  if ((sectionKey === "logicFramework" || !sectionKey) && isFrameworkSentence(itemText)) {
    return {
      mode: "none",
      quoteHighlight: null,
      emphasisSpans: [],
      fallbackEmphasis: null,
      coverageFallback
    };
  }

  const shouldSkipQuote =
    highlights.length > 1 ||
    EVIDENCE_INTRO_PATTERN.test(itemText) ||
    (sectionKey && LEARNING_SECTION_KEYS.includes(sectionKey)) ||
    highlights.some((highlight) => /[、，,]/.test(highlight.text));
  const quoteHighlight = shouldSkipQuote
    ? null
    : chooseQuoteHighlight(itemText, candidates, highlights.length, sectionKey);
  const emphasisSpans = quoteHighlight
    ? []
    : selectInlineEmphasisSpans(itemText, candidates, highlights.length, sectionKey);

  if (quoteHighlight) {
    return {
      mode: "quote",
      quoteHighlight,
      emphasisSpans: [],
      fallbackEmphasis: null,
      coverageFallback
    };
  }

  if (emphasisSpans.length) {
    return {
      mode: "emphasis",
      quoteHighlight: null,
      emphasisSpans,
      fallbackEmphasis: null,
      coverageFallback
    };
  }

  const fallbackEmphasis = buildEmphasisFallback(itemText, highlights, candidates, fallbackTone, sectionKey);

  if (fallbackEmphasis) {
    return {
      mode: "emphasis",
      quoteHighlight: null,
      emphasisSpans: [],
      fallbackEmphasis,
      coverageFallback
    };
  }

  return {
    mode: "none",
    quoteHighlight: null,
    emphasisSpans: [],
    fallbackEmphasis: null,
    coverageFallback
  };
}

export function normalizeSentenceEmphasisPresentation(
  itemText: string,
  highlights: TextHighlight[],
  fallbackTone: HighlightTone,
  sectionKey?: HighlightSectionKey
): SentenceHighlightPresentation {
  return decideHighlightRenderMode(itemText, highlights, fallbackTone, sectionKey);
}

export function normalizeEmphasisSpansForSentence(
  itemText: string,
  highlights: TextHighlight[],
  fallbackTone: HighlightTone,
  sectionKey?: HighlightSectionKey
): EmphasisSpan[] {
  return decideHighlightRenderMode(itemText, highlights, fallbackTone, sectionKey).emphasisSpans;
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

function stripLeadingFramingShell(text: string) {
  return text
    .replace(/^(?:在[^，。；！？!?]{0,24}(?:中|下)|对于[^，。；！？!?]{0,24}(?:而言|来说)?|当[^，。；！？!?]{0,24}时)\s*[，,:：]?\s*/i, "")
    .trim();
}

function stripLeadingTopicShell(text: string) {
  return text.replace(TOPIC_SHELL_PATTERN, "").replace(/^[，,:：\s]+/, "").trim();
}

function stripLeadingAttributionShell(text: string) {
  return text
    .replace(
      /^(?:[^，。；！？!?]{0,24}(?:显示|表明|指出|强调|说明|发现|证明|提醒|意味着)|该报告|报告|研究|实验|数据显示|内部实验)[，,:：]?\s*/i,
      ""
    )
    .trim();
}

function stripJudgmentLead(text: string) {
  return text.replace(/^(?:而是|而非|而不是|而在于)/, "").trim();
}

function stripCoreConclusionShell(text: string) {
  return text
    .replace(
      /^(?:作者反复强调|真正要避免的是|要避免的是|真正关键的是|关键在于|核心在于|核心价值在于|本质在于|重点在于|真正的问题在于|而在于|而是|而非|而不是)\s*/i,
      ""
    )
    .trim();
}

function stripStepLead(text: string) {
  return text.replace(/^(?:先|再|最后|然后|随后|接着|再去|再把|先把)\s*/i, "").trim();
}

function stripEvidenceTail(text: string) {
  return text
    .replace(/(?:才是|就是|即是)?关键差异$/, "")
    .replace(/(?:才是|就是)?关键$/, "")
    .trim();
}

function stripLeadingRuleShell(text: string) {
  return text.replace(/^(?:应|应该|需|需要|要|必须)\s*/i, "").trim();
}

function stripLeadingConditionShell(text: string) {
  return text
    .replace(/^(?:当[^，。；！？!?]{0,28}时|处理[^，。；！？!?]{0,28}时|面向[^，。；！？!?]{0,28}时|部署[^，。；！？!?]{0,24}时)\s*[，,:：]?\s*/i, "")
    .trim();
}

function normalizeActionRuleClause(text: string) {
  return sanitizeCandidate(
    stripLeadingRuleShell(
      stripStepLead(
        stripLeadingConditionShell(
          stripLeadingTopicShell(stripLeadingFramingShell(text))
        )
      )
    )
  );
}

function extractThresholdRuleSegments(text: string) {
  return extractPatternMatches(text, THRESHOLD_RULE_SEGMENT_PATTERN)
    .map((segment) => sanitizeCandidate(segment.replace(/^当/, "")))
    .filter(Boolean);
}

function extractThresholdDecisionPairs(text: string) {
  const clauses = text
    .split(/[，,；;]/g)
    .map((part) => sanitizeCandidate(part))
    .filter(Boolean);
  const pairs: string[] = [];

  for (let index = 0; index < clauses.length; index += 1) {
    const clause = sanitizeCandidate(clauses[index] || "");

    if (!/\d+\s*GB/i.test(clause)) {
      continue;
    }

    const nextClause = sanitizeCandidate(clauses[index + 1] || "");
    const thresholdMatch = clause.match(/(≥|>=)?\s*(\d+\s*GB)/i);
    const versionMatch = nextClause.match(/(E2B|E4B|31B|26B|MoE)/i);

    if (!thresholdMatch?.[2] || !versionMatch?.[1]) {
      continue;
    }

    const threshold = `${thresholdMatch[1] ? "≥" : ""}${thresholdMatch[2].replace(/\s+/g, "")}`;
    const action = /启用|运行/.test(nextClause) ? "启用" : "选";
    pairs.push(`${threshold}${action}${versionMatch[1]}`);
  }

  return pairs;
}

function extractStepSequenceClauses(text: string) {
  return extractPatternMatches(text, STEP_SEQUENCE_PATTERN)
    .map((clause) => clause.replace(/[（(][^）)]{0,24}[）)]/g, ""))
    .map(stripStepLead)
    .map((clause) => sanitizeCandidate(clause))
    .filter(Boolean);
}

function buildThresholdRuleFallbackText(text: string) {
  const decisionPairs = extractThresholdDecisionPairs(text).slice(0, 3);

  if (decisionPairs.length >= 2) {
    const candidate = decisionPairs.join("，");
    return fitsFallbackLength(candidate) ? candidate : decisionPairs.slice(0, 2).join("，");
  }

  const segments = extractThresholdRuleSegments(text).slice(0, 3);

  if (segments.length < 2) {
    return null;
  }

  const compact = segments.map((segment) => {
    const normalized = sanitizeCandidate(segment).replace(/\s+/g, "");
    const thresholdMatch = normalized.match(/(≥|>=)?(\d+GB)/i);
    const versionMatch = normalized.match(/(E2B|E4B|31B|26B|MoE)/i);

    if (thresholdMatch?.[2] && versionMatch?.[1]) {
      const prefix = thresholdMatch[1] ? `≥${thresholdMatch[2]}` : thresholdMatch[2];
      const action = /启用|运行/.test(normalized) ? "启用" : "选";
      return `${prefix}${action}${versionMatch[1]}`;
    }

    return normalized
      .replace(/^当?设备?内存/, "内存")
      .replace(/(?:时|情况下)$/, "");
  });

  const candidate = compact.join("，");
  return fitsFallbackLength(candidate) ? candidate : compact.slice(0, 2).join("，");
}

function compactOrderedStep(step: string) {
  const normalized = sanitizeCandidate(step);

  if (/安装\s*Ollama/i.test(normalized)) {
    return "安装Ollama";
  }

  const pullMatch = normalized.match(/pull\s+[A-Za-z0-9._-]+/i);

  if (pullMatch?.[0]) {
    return pullMatch[0];
  }

  const runMatch = normalized.match(/run\s+[A-Za-z0-9._-]+/i);

  if (runMatch?.[0]) {
    return runMatch[0];
  }

  return normalized
    .replace(/^执行/i, "")
    .replace(/^ollama\s+/i, "");
}

function buildOrderedStepFallbackText(text: string) {
  const steps = extractStepSequenceClauses(text)
    .map(compactOrderedStep)
    .filter(Boolean)
    .slice(0, 3);

  if (steps.length < 2) {
    return null;
  }

  const candidate = steps.join("→");
  return fitsFallbackLength(candidate) ? candidate : buildCompactEmphasis(steps, "action")?.text ?? steps[0] ?? null;
}

function splitSentenceIntoClauses(text: string) {
  return text
    .split(/[，,；;：:]/g)
    .map((part) => sanitizeCandidate(stripLeadingTopicShell(stripLeadingFramingShell(part))))
    .filter(Boolean);
}

function sliceFromFirstMarker(text: string, markers: string[]) {
  for (const marker of markers) {
    const index = text.indexOf(marker);

    if (index !== -1) {
      return sanitizeCandidate(text.slice(index));
    }
  }

  return null;
}

function extractContrastFocusCandidates(text: string) {
  const candidates: string[] = [];
  const clauses = text
    .split(/[。！？!?；;\n]/g)
    .map((part) => sanitizeCandidate(part))
    .filter(Boolean);
  const thresholdLike = extractThresholdRuleSegments(text).length > 0 || countMatches(text, STEP_SEQUENCE_PATTERN) > 0;

  for (const clause of clauses) {
    if (/(?:而不是|而非|不是|并非)/i.test(clause)) {
      const postContrast = sliceFromFirstMarker(clause, ["而是", "而在于", "而要", "而改为", "而转为"]);

      if (postContrast) {
        candidates.push(postContrast);
      }
    }

    const turnContrast = sliceFromFirstMarker(clause, ["而是", "但", "却", "然而", "可是", "不过", "只是"]);

    if (turnContrast) {
      candidates.push(turnContrast);
    }

    if (!thresholdLike) {
      const exclusiveContrast = sliceFromFirstMarker(clause, ["才", "只有"]);

      if (exclusiveContrast) {
        candidates.push(exclusiveContrast);
      }
    }
  }

  const unique = new Set<string>();

  return candidates.filter((candidate) => {
    const normalized = sanitizeCandidate(candidate);

    if (
      !normalized ||
      unique.has(normalized.toLowerCase()) ||
      isStructuralShellCandidate(normalized) ||
      isLowSignalStandaloneCandidate(normalized)
    ) {
      return false;
    }

    unique.add(normalized.toLowerCase());
    return true;
  });
}

function isContrastFocusCandidate(text: string) {
  const normalized = sanitizeCandidate(text);

  if (!normalized || isStructuralShellCandidate(normalized) || isLowSignalStandaloneCandidate(normalized)) {
    return false;
  }

  return CONTRAST_MARKER_PATTERN.test(normalized);
}

function extractPatternCaptures(text: string, pattern: RegExp) {
  const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))];

  return matches
    .map((match) => sanitizeCandidate(match[1] || match[0] || ""))
    .filter(Boolean);
}

function buildSectionNavigationCandidates(
  itemText: string,
  sectionKey: HighlightSectionKey
) {
  const clauses = splitSentenceIntoClauses(itemText);
  const contrastCandidates = extractContrastFocusCandidates(itemText);

  switch (sectionKey) {
    case "coreConclusion":
      return [
        ...contrastCandidates,
        ...extractPatternCaptures(
          itemText,
          /(?:而是|而非|而不是|而在于|而在)([^，。；！？!?]{3,24})/gi
        ).map(stripJudgmentLead),
        ...extractPatternCaptures(
          itemText,
          /(?:关键|核心|本质|重点|核心价值)(?:在于|是)([^，。；！？!?]{3,28})/gi
        ).map(stripJudgmentLead),
        ...extractPatternCaptures(
          itemText,
          /(?:应作为|应是|应该是)([^，。；！？!?]{3,18})/gi
        ),
        ...clauses
      ];
    case "logicFramework":
      return [
        ...contrastCandidates,
        ...extractPatternCaptures(
          itemText,
          /(?:导致|驱动|形成|构成|实现|支撑|决定|提供|划定)([^，。；！？!?]{3,18})/gi
        ),
        ...clauses.filter((clause) => LOGIC_FRAMEWORK_PATTERN.test(clause))
      ];
    case "keyDetails":
      return [
        ...contrastCandidates,
        ...extractPatternCaptures(
          itemText,
          /(?:关注点是|关键(?:指标|目标)?是|关键在于|真正关键的是)([^。；！？!?]{3,20})/gi
        ),
        ...extractPatternCaptures(
          itemText,
          /(?:显示|表明|指出|强调|说明|发现|证明|意味着)([^。；！？!?]{3,30})/gi
        ).map(stripLeadingAttributionShell),
        ...clauses
          .map(stripLeadingAttributionShell)
          .filter((clause) => KEY_DETAIL_EVIDENCE_PATTERN.test(clause) || GOVERNOR_PATTERN.test(clause))
      ];
    case "reusablePoints":
      return [
        ...contrastCandidates,
        ...extractPatternCaptures(
          itemText,
          /[:：]\s*([^。！？!?]{3,28})/g
        ),
        ...extractPatternCaptures(
          itemText,
          /(?:优先|先|应|应该|需|需要|要|必须|避免|显式|作为)([^，。；！？!?]{3,22})/gi
        ),
        ...clauses
      ];
    default:
      return clauses;
  }
}

function extractPatternMatches(text: string, pattern: RegExp) {
  const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))];

  return matches
    .map((match) => sanitizeCandidate(match[0] || ""))
    .filter(Boolean);
}

function pickSectionInlineAnchor(
  itemText: string,
  sectionKey: HighlightSectionKey,
  fallbackTone: HighlightTone
): EmphasisSpan | null {
  const clauses = splitSentenceIntoClauses(itemText);
  const contrastCandidates = extractContrastFocusCandidates(itemText);

  for (const contrastCandidate of contrastCandidates) {
    if (!isUsefulSectionCandidate(contrastCandidate, sectionKey) || !fitsSectionInlineLength(contrastCandidate, sectionKey)) {
      continue;
    }

    const range = findEmphasisRange(itemText, contrastCandidate);

    if (range && isSafeEmphasisRange(itemText, range)) {
      return {
        text: range.text,
        tone: fallbackTone
      };
    }
  }

  let rawCandidates: string[] = [];

  switch (sectionKey) {
    case "coreConclusion":
      {
        const quotedJudgment = itemText.match(/[“"]([^”"]{4,28})[”"]/);

        if (quotedJudgment?.[1]) {
          return {
            text: sanitizeCandidate(quotedJudgment[1]),
            tone: fallbackTone
          };
        }

        const turningPoint = itemText.match(/(?:而在于|而是|而非|而不是)([^，。；！？!?]{3,24})/i);

        if (turningPoint?.[1]) {
          return {
            text: sanitizeCandidate(turningPoint[1]),
            tone: fallbackTone
          };
        }
      }

      rawCandidates = [
        ...extractPatternCaptures(itemText, /(?:而在于|而是|而非|而不是)([^，。；！？!?]{3,24})/gi).map(stripJudgmentLead),
        ...extractPatternCaptures(itemText, /(?:关键|核心|本质|重点|核心价值)(?:在于|是)([^，。；！？!?]{3,28})/gi).map(stripCoreConclusionShell),
        ...extractPatternMatches(itemText, /而在[^，。；！？!?]{3,24}/gi),
        ...clauses
          .slice()
          .reverse()
          .map(stripLeadingAttributionShell)
          .map(stripLeadingFramingShell)
          .map(stripCoreConclusionShell)
      ];
      break;
    case "logicFramework":
      {
        const mechanismPairCandidates = [
          ...extractPatternMatches(
            itemText,
            /多尺寸架构(?:（[^）]+）)?与Ollama自动适配机制/g
          ),
          ...extractPatternMatches(itemText, /多尺寸架构/g),
          ...extractPatternMatches(itemText, /Ollama自动适配机制|自动适配机制/g)
        ];

        for (const mechanismCandidate of mechanismPairCandidates) {
          if (fitsSectionInlineLength(mechanismCandidate, sectionKey)) {
            return {
              text: sanitizeCandidate(mechanismCandidate),
              tone: fallbackTone
            };
          }
        }
      }

      rawCandidates = [
        ...extractPatternMatches(
          itemText,
          /(?:多尺寸架构(?:（[^）]+）)?(?:与|和)?Ollama自动适配机制|多尺寸架构(?:（[^）]+）)?|Ollama自动适配机制|自动适配机制|零数据出域、零服务依赖、零排队延迟)/gi
        ),
        ...extractPatternCaptures(
          itemText,
          /(?:关键在于|真正关键的是|核心在于|本质在于)([^，。；！？!?]{3,24})/gi
        ),
        ...extractPatternCaptures(
          itemText,
          /([^，。；！？!?]{3,24})比[^，。；！？!?]{1,12}更关键/gi
        ),
        ...extractPatternMatches(itemText, /(?:导致|驱动|形成|构成|实现|支撑|决定|提供|划定)[^，。；！？!?]{3,18}/gi),
        ...extractPatternMatches(itemText, /(?:尺寸分层(?:与运行框架封装)?|运行框架封装|去中心化交付链|路径依赖惯性|分阶段强约束|三重刚性需求驱动)/g),
        ...extractPatternMatches(itemText, STEP_SEQUENCE_PATTERN),
        ...clauses.filter((clause) => {
          const normalized = normalizeActionRuleClause(clause);
          return (
            (MECHANISM_NODE_PATTERN.test(normalized) ||
              LOGIC_FRAMEWORK_PATTERN.test(normalized) ||
              (REUSABLE_ACTION_PATTERN.test(normalized) && REUSABLE_OBJECT_PATTERN.test(normalized))) &&
            !ABSTRACT_LOGIC_SLOGAN_PATTERN.test(normalized)
          );
        })
      ];
      break;
    case "keyDetails":
      rawCandidates = [
        ...extractPatternMatches(itemText, VALUE_CLUSTER_PATTERN),
        ...extractPatternCaptures(
          itemText,
          /((?:完全免费|数据保留本地|断网可用)(?:、(?:完全免费|数据保留本地|断网可用)){0,3})才是关键差异/gi
        ),
        ...extractPatternCaptures(
          itemText,
          /((?:安装仅需\d+步|自动匹配设备最优版本|全程\d+分钟内完成|内存为关键瓶颈))[^。；！？!?]{0,12}/gi
        ),
        ...extractPatternMatches(itemText, /(?:其|真正)?关注点是[^。；！？!?]{3,20}|关键(?:指标|目标)?是[^。；！？!?]{3,20}|关键在于[^。；！？!?]{3,20}|真正关键的是[^。；！？!?]{3,20}/gi)
          .map(stripLeadingAttributionShell),
        ...extractPatternMatches(itemText, /(?:完全免费|数据保留本地|断网可用|安装仅需\d+步|自动匹配设备最优版本|全程\d+分钟内完成|内存为关键瓶颈|效率提升约?\d+(?:\.\d+)?倍)/gi)
          .map(stripEvidenceTail),
        ...extractPatternMatches(itemText, /(?:提升|提高|下降|减少|增加|效率|稳定性|成功率|错误率|限制|前提|条件|差异|对比)[^。；！？!?]{0,18}/gi),
        ...clauses
          .map(stripLeadingAttributionShell)
          .map(stripEvidenceTail)
          .filter((clause) => KEY_DETAIL_EVIDENCE_PATTERN.test(clause) && !BACKGROUND_SHELL_PATTERN.test(clause))
      ];
      break;
    case "reusablePoints":
      if (
        countMatches(itemText, /(?:先|再|最后|然后|随后|接着)/g) > 1 ||
        extractThresholdRuleSegments(itemText).length > 1
      ) {
        return null;
      }

      rawCandidates = [
        ...extractPatternMatches(itemText, /(?:输入即本地|验证即交付|以内存容量为首要判据|做盈亏平衡测算|尺寸分层\+运行框架封装|将任务拆解为[^，。；！？!?]{2,18}原子单元)/gi),
        ...extractPatternMatches(itemText, /(?:必须[^，。；！？!?]{2,20}|禁用[^，。；！？!?]{2,20}|优先[^，。；！？!?]{2,20}|避免[^，。；！？!?]{2,20})/gi),
        ...extractPatternCaptures(
          itemText,
          /[，,:：]\s*((?:必须|应|应该|需|需要|要|优先|禁用|避免)[^。；！？!?]{4,30})/gi
        ),
        ...clauses.map(normalizeActionRuleClause)
      ].filter((clause) => {
        const normalized = normalizeActionRuleClause(clause);
        return (
          (REUSABLE_RULE_PATTERN.test(normalized) ||
            (REUSABLE_ACTION_PATTERN.test(normalized) && REUSABLE_OBJECT_PATTERN.test(normalized))) &&
          !TOPIC_SHELL_PATTERN.test(normalized)
        );
      });
      break;
    default:
      return null;
  }

  const uniqueCandidates = [...new Map(
    rawCandidates
      .map((candidate) => {
        const normalized =
          sectionKey === "logicFramework"
            ? normalizeActionRuleClause(candidate)
            : sectionKey === "reusablePoints"
              ? sanitizeCandidate(
                  stripStepLead(
                    stripLeadingConditionShell(
                      stripLeadingTopicShell(stripLeadingFramingShell(candidate))
                    )
                  )
                )
            : candidate;

        return [sanitizeCandidate(normalized).toLowerCase(), sanitizeCandidate(normalized)] as const;
      })
      .filter((entry) => entry[1])
  ).values()];

  for (const candidate of uniqueCandidates) {
    if (!isUsefulSectionCandidate(candidate, sectionKey) || !fitsSectionInlineLength(candidate, sectionKey)) {
      continue;
    }

    const isMechanismPairCandidate =
      sectionKey === "logicFramework" &&
      /多尺寸架构/.test(candidate) &&
      /(?:Ollama自动适配机制|自动适配机制)/.test(candidate);

    if (
      itemText.includes(candidate) &&
      (!coversTooMuchOfItem(itemText, candidate) || isMechanismPairCandidate) &&
      !isTitleOnlyCandidate(candidate) &&
      !isDateLikeCandidate(candidate) &&
      !isNumericLikeCandidate(candidate) &&
      !hasBrokenPairBoundary(candidate)
    ) {
      return {
        text: candidate,
        tone: fallbackTone
      };
    }

    const range = findEmphasisRange(itemText, candidate);

    if (range && isSafeEmphasisRange(itemText, range)) {
      return {
        text: range.text,
        tone: fallbackTone
      };
    }
  }

  return null;
}

function pickSectionFallbackEmphasis(
  itemText: string,
  fallbackTone: HighlightTone,
  sectionKey: HighlightSectionKey
): FallbackEmphasis | null {
  const contrastFallback = extractContrastFocusCandidates(itemText).find(
    (candidate) => fitsFallbackLength(candidate) && !coversTooMuchOfItem(itemText, candidate)
  );

  if (contrastFallback) {
    return {
      text: contrastFallback,
      tone: fallbackTone
    };
  }

  if (sectionKey === "coreConclusion" || sectionKey === "logicFramework") {
    if (sectionKey === "logicFramework") {
      const valueCluster = itemText.match(VALUE_CLUSTER_PATTERN)?.[0];

      if (valueCluster) {
        const clusterText = sanitizeCandidate(valueCluster);

        if (!coversTooMuchOfItem(itemText, clusterText) && fitsFallbackLength(clusterText)) {
          return {
            text: clusterText,
            tone: fallbackTone
          };
        }
      }
    }

    const normalizedSentence = sanitizeCandidate(stripLeadingTopicShell(stripLeadingFramingShell(itemText)));

    if (
      normalizedSentence &&
      !BACKGROUND_SHELL_PATTERN.test(normalizedSentence) &&
      ((sectionKey === "coreConclusion" && (CORE_CONCLUSION_PATTERN.test(normalizedSentence) || CHANGE_PATTERN.test(normalizedSentence))) ||
        (sectionKey === "logicFramework" && LOGIC_FRAMEWORK_PATTERN.test(normalizedSentence)))
    ) {
      return {
        text: normalizedSentence,
        tone: fallbackTone
      };
    }
  }

  if (sectionKey === "keyDetails") {
    const valueCluster = itemText.match(VALUE_CLUSTER_PATTERN)?.[0];

    if (valueCluster) {
      const clusterText = sanitizeCandidate(valueCluster);

      if (!coversTooMuchOfItem(itemText, clusterText) && fitsFallbackLength(clusterText)) {
        return {
          text: clusterText,
          tone: fallbackTone
        };
      }
    }

    const evidenceListMatch = itemText.match(
      /((?:完全免费|数据保留本地|断网可用)(?:、(?:完全免费|数据保留本地|断网可用)){1,3})/
    );

    if (evidenceListMatch?.[1]) {
      const evidenceText = sanitizeCandidate(evidenceListMatch[1]);

      if (!coversTooMuchOfItem(itemText, evidenceText) && fitsFallbackLength(evidenceText)) {
        return {
          text: evidenceText,
          tone: fallbackTone
        };
      }
    }

    const governorMatch = sanitizeCandidate(itemText).match(
      /^([^，。！？!?；;]{0,12}(?:问题|例子|案例|结果|证据|实验结果|方法|做法|路径|原因|风险|表现|结论|要点)(?:在于|包括|体现为|例如|如|有|为|是)?)(.*)$/i
    );

    if (!governorMatch) {
      return null;
    }

    const governor = sanitizeCandidate(governorMatch[1] || "");
    const firstItem = sanitizeCandidate((governorMatch[2] || "").split(/[、，,]|和/g)[0] || "");

    if (!governor || !firstItem) {
      return null;
    }

    const candidateText = sanitizeCandidate(joinSemanticParts(governor, firstItem));

    if (!fitsFallbackLength(candidateText) || coversTooMuchOfItem(itemText, candidateText)) {
      return null;
    }

    return {
      text: candidateText,
      tone: fallbackTone
    };
  }

  if (sectionKey === "reusablePoints") {
    const thresholdRuleFallbackText = buildThresholdRuleFallbackText(itemText);

    if (thresholdRuleFallbackText) {
      return {
        text: thresholdRuleFallbackText,
        tone: fallbackTone
      };
    }

    const orderedStepFallbackText = buildOrderedStepFallbackText(itemText);

    if (orderedStepFallbackText) {
      return {
        text: orderedStepFallbackText,
        tone: fallbackTone
      };
    }

    const stepClauses = extractStepSequenceClauses(itemText)
      .map((clause) => sanitizeCandidate(clause))
      .filter(Boolean);

    if (stepClauses.length < 2) {
      return null;
    }

    return buildCompactEmphasis(stepClauses.slice(0, 3), fallbackTone);
  }

  return null;
}

function isUsefulSectionCandidate(text: string, sectionKey?: HighlightSectionKey) {
  if (!sectionKey || !LEARNING_SECTION_KEYS.includes(sectionKey)) {
    return true;
  }

  const normalized = sanitizeCandidate(
    stripLeadingRuleShell(
      stripLeadingConditionShell(
        stripLeadingTopicShell(stripLeadingAttributionShell(stripLeadingFramingShell(text)))
      )
    )
  );

  if (!normalized || isStructuralShellCandidate(normalized)) {
    return false;
  }

  if (isContrastFocusCandidate(normalized)) {
    return true;
  }

  switch (sectionKey) {
    case "coreConclusion":
      return (
        CORE_CONCLUSION_PATTERN.test(normalized) ||
        JUDGMENT_PATTERN.test(normalized) ||
        CHANGE_PATTERN.test(normalized) ||
        WARNING_PATTERN.test(normalized) ||
        CORE_NAVIGATION_PATTERN.test(normalized)
      );
    case "logicFramework":
      return (
        (MECHANISM_NODE_PATTERN.test(normalized) ||
          LOGIC_FRAMEWORK_PATTERN.test(normalized) ||
          (REUSABLE_ACTION_PATTERN.test(normalized) && REUSABLE_OBJECT_PATTERN.test(normalized))) &&
        !ABSTRACT_LOGIC_SLOGAN_PATTERN.test(normalized)
      );
    case "keyDetails":
      return (
        (KEY_DETAIL_EVIDENCE_PATTERN.test(normalized) || GOVERNOR_PATTERN.test(normalized)) &&
        !BACKGROUND_SHELL_PATTERN.test(normalized) &&
        !LOW_SIGNAL_DETAIL_TAIL_PATTERN.test(normalized)
      );
    case "reusablePoints":
      return (
        (REUSABLE_RULE_PATTERN.test(normalized) ||
          (REUSABLE_ACTION_PATTERN.test(normalized) && REUSABLE_OBJECT_PATTERN.test(normalized))) &&
        !CASE_SPECIFIC_PATTERN.test(normalized)
      );
    default:
      return true;
  }
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

function buildEmphasisRanges(text: string, emphasisSpans: EmphasisSpan[]) {
  const selected: Array<{ start: number; end: number; tone: HighlightTone }> = [];

  for (const emphasis of emphasisSpans) {
    const range = findEmphasisRange(text, emphasis.text);

    if (!range || !isSafeEmphasisRange(text, range)) {
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
      tone: emphasis.tone
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

export function splitSentenceWithEmphasis(
  sentence: string,
  emphasisSpans: EmphasisSpan[]
): EmphasisSegment[] {
  if (isFrameworkSentence(sentence)) {
    return [{ text: sentence, tone: null }];
  }

  const ranges = buildEmphasisRanges(sentence, emphasisSpans);

  if (!ranges.length) {
    return [{ text: sentence, tone: null }];
  }

  const segments: EmphasisSegment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({
        text: sentence.slice(cursor, range.start),
        tone: null
      });
    }

    segments.push({
      text: sentence.slice(range.start, range.end),
      tone: range.tone
    });

    cursor = range.end;
  }

  if (cursor < sentence.length) {
    segments.push({
      text: sentence.slice(cursor),
      tone: null
    });
  }

  return segments.filter((segment) => segment.text);
}
