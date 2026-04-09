import { buildKnowledgeSections } from "./aiPresentation";
import type { AppLanguage, Folder, RecordItem, Tag } from "../types/domain";
import { getFolderDisplayName, getMessages } from "./i18n";
import { getPlatformLabel } from "./platform";
import { formatDateTime } from "./time";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function renderLines(lines: Array<string | { text: string }>) {
  return lines
    .map((line) => ("string" === typeof line ? line : line.text))
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
}

function renderAiResult(record: RecordItem, language: AppLanguage) {
  const copy = getMessages(language).export;
  const mode = record.currentMode || (record.aiOutputs.learning ? "learning" : "concise");

  if (mode === "concise") {
    const slot = record.aiOutputs.concise;

    if (!slot) {
      return `<p>${copy.noAiResult}</p>`;
    }

    const sections = buildKnowledgeSections("concise", slot.currentResult, {
      summary: copy.summary,
      bullets: copy.bullets,
      coreConclusion: copy.coreConclusion,
      logicFramework: copy.logicFramework,
      keyDetails: copy.keyDetails,
      reusablePoints: copy.reusablePoints
    });

    return `
      <section>
        <h3>${copy.conciseTitle}</h3>
        ${sections
          .map(
            (section) => `
              <p><strong>${escapeHtml(section.title)}:</strong></p>
              <ul>${renderLines(section.items)}</ul>
            `
          )
          .join("")}
      </section>
    `;
  }

  const slot = record.aiOutputs.learning;

  if (!slot) {
    return `<p>${copy.noAiResult}</p>`;
  }

  const sections = buildKnowledgeSections("learning", slot.currentResult, {
    summary: copy.summary,
    bullets: copy.bullets,
    coreConclusion: copy.coreConclusion,
    logicFramework: copy.logicFramework,
    keyDetails: copy.keyDetails,
    reusablePoints: copy.reusablePoints
  });

  return `
    <section>
      <h3>${copy.learningTitle}</h3>
      ${sections
        .map(
          (section) => `
            <p><strong>${escapeHtml(section.title)}:</strong></p>
            <ul>${renderLines(section.items)}</ul>
          `
        )
        .join("")}
    </section>
  `;
}

function createDocumentHtml(title: string, body: string) {
  return `
    <div style="font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;color:#0f172a;padding:24px;background:#fff;">
      <style>
        h1,h2,h3 { margin: 0 0 12px; }
        p,li { line-height: 1.7; font-size: 14px; }
        section { margin-bottom: 24px; page-break-inside: avoid; }
        .meta { color: #475569; font-size: 13px; }
        .record { border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
      </style>
      <h1>${escapeHtml(title)}</h1>
      ${body}
    </div>
  `;
}

async function exportHtmlToPdf(filename: string, html: string) {
  const html2pdf = (await import("html2pdf.js")).default;
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  await html2pdf()
    .set({
      margin: 10,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] }
    })
    .from(container)
    .save();

  document.body.removeChild(container);
}

export async function exportRecordToPdf(
  record: RecordItem,
  folderName: string,
  tags: Tag[],
  language: AppLanguage
) {
  const copy = getMessages(language).export;
  const tagNames = tags.filter((tag) => record.tagIds.includes(tag.id)).map((tag) => tag.name);
  const html = createDocumentHtml(
    record.title,
    `
      <section class="record">
        <p class="meta">${copy.platform}: ${escapeHtml(getPlatformLabel(record.sourcePlatform, language))}</p>
        <p class="meta">${copy.folder}: ${escapeHtml(folderName)}</p>
        <p class="meta">${copy.tags}: ${escapeHtml(tagNames.join("、") || "—")}</p>
        <p class="meta">${copy.originalUrl}: ${escapeHtml(record.originalUrl || "—")}</p>
        <p class="meta">${copy.createdAt}: ${escapeHtml(formatDateTime(record.createdAt))}</p>
        <p class="meta">${copy.updatedAt}: ${escapeHtml(formatDateTime(record.updatedAt))}</p>
        <p class="meta">${copy.watchedAt}: ${escapeHtml(formatDateTime(record.watchedAt))}</p>
      </section>
      <section>
        <h3>${copy.originalContent}</h3>
        <p style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(record.originalContent || "—")}</p>
      </section>
      ${renderAiResult(record, language)}
      <section>
        <h3>${copy.personalNote}</h3>
        <p>${escapeHtml(record.personalNote || "—")}</p>
      </section>
    `
  );

  await exportHtmlToPdf(`${record.title}.pdf`, html);
}

export async function exportFolderToPdf(
  folder: Folder,
  records: RecordItem[],
  tags: Tag[],
  language: AppLanguage
) {
  const copy = getMessages(language).export;
  const body = records
    .map((record) => {
      const tagNames = tags
        .filter((tag) => record.tagIds.includes(tag.id))
        .map((tag) => tag.name);

      return `
        <article class="record">
          <h2>${escapeHtml(record.title)}</h2>
          <p class="meta">${copy.platform}: ${escapeHtml(getPlatformLabel(record.sourcePlatform, language))}</p>
          <p class="meta">${copy.tags}: ${escapeHtml(tagNames.join("、") || "—")}</p>
          <p class="meta">${copy.originalUrl}: ${escapeHtml(record.originalUrl || "—")}</p>
          <p class="meta">${copy.createdAt}: ${escapeHtml(formatDateTime(record.createdAt))}</p>
          <section>
            <h3>${copy.originalContent}</h3>
            <p style="white-space: pre-wrap; word-break: break-word;">${escapeHtml(record.originalContent || "—")}</p>
          </section>
          ${renderAiResult(record, language)}
          <section>
            <h3>${copy.personalNote}</h3>
            <p>${escapeHtml(record.personalNote || "—")}</p>
          </section>
        </article>
      `;
    })
    .join("");

  const html = createDocumentHtml(
    copy.folderExportTitle(getFolderDisplayName(folder, language)),
    body || `<p>${copy.emptyFolder}</p>`
  );

  await exportHtmlToPdf(`${getFolderDisplayName(folder, language)}.pdf`, html);
}
