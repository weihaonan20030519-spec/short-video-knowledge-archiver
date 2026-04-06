import type { RecordItem, Tag } from "../types/domain";

export function buildAiSearchText(record: RecordItem) {
  const texts: string[] = [];

  const concise = record.aiOutputs.concise?.currentResult;
  if (concise) {
    texts.push(concise.summary, ...concise.bullets);
  }

  const learning = record.aiOutputs.learning?.currentResult;
  if (learning) {
    texts.push(
      learning.coreConclusion,
      ...learning.logicFramework,
      ...learning.keyDetails,
      ...learning.reusablePoints
    );
  }

  return texts.join(" ").toLowerCase();
}

export function buildRecordSearchText(record: RecordItem, tags: Tag[]) {
  const tagText = tags
    .filter((tag) => record.tagIds.includes(tag.id))
    .map((tag) => tag.name)
    .join(" ");
  const transcriptMetaText = [
    record.transcriptMeta?.fileName,
    record.transcriptMeta?.mimeType,
    record.transcriptMeta?.language,
    record.transcriptMeta?.warnings?.join(" ")
  ]
    .filter(Boolean)
    .join(" ");

  return [
    record.title,
    record.originalContent,
    record.personalNote,
    tagText,
    transcriptMetaText,
    buildAiSearchText(record)
  ]
    .join(" ")
    .toLowerCase();
}
