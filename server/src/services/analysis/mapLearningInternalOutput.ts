import type { LearningOutput } from "../../../../shared/src/analysis/analyzeContracts.js";
import type { LearningInternalOutput } from "../../schemas/analyzeSchemas.js";

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function dedupe(items: string[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const normalized = normalizeText(item);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function stripEvidenceWrapper(value: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  const colonMatch = normalized.match(
    /^(?:真正有价值的部分是|关键证据是|最硬证据是|最关键的是|重点是|核心是)[:：]\s*(.+)$/
  );

  if (colonMatch?.[1]) {
    return normalizeText(colonMatch[1]);
  }

  const reportWrapperMatch = normalized.match(
    /^(?:[^。；;]*?(?:报告|白皮书|论文|研究|笔记|文章)[^。；;]*?(?:明确指出|指出|说明|显示|表明|证明|强调))(.+)$/
  );

  if (reportWrapperMatch?.[1]) {
    const stripped = normalizeText(reportWrapperMatch[1]);

    if (/(?:是|而非|不是|关键|核心|关注点|重点)/.test(stripped)) {
      return stripped;
    }
  }

  return normalized;
}

export function mapLearningInternalOutput(
  internal: LearningInternalOutput
): LearningOutput {
  const claimCore = normalizeText(internal.claimCore);
  const claimContrast = normalizeText(internal.claimContrast);
  const mechanismChain = dedupe(internal.mechanismChain);
  const decisiveEvidence = dedupe(internal.decisiveEvidence);
  const actionRules = dedupe(internal.actionRules);

  return {
    coreConclusion: claimCore,
    logicFramework: dedupe([
      ...(claimContrast ? [claimContrast] : []),
      ...mechanismChain
    ]),
    keyDetails: dedupe(decisiveEvidence.map(stripEvidenceWrapper)),
    reusablePoints: actionRules
  };
}
