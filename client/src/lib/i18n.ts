import type {
  AIStatus,
  AppLanguage,
  Folder,
  HighlightTone,
  SourcePlatform,
  SourceType,
  TranscriptionStatus
} from "../types/domain";
import type {
  AnalyzeErrorCode,
  AnalyzeFeedback,
  BilibiliImportErrorCode,
  TranscriptionErrorCode
} from "../types/api";
import type { ImportIssueCode } from "../services/import/importTypes";
import type { UploadUiStatus } from "../services/transcription/transcriptionTypes";

export const APP_LANGUAGE_STORAGE_KEY = "svka:app-language";

export interface LanguageOption {
  value: AppLanguage;
  label: string;
  shortLabel: string;
}

export const languageOptions: LanguageOption[] = [
  { value: "zh-CN", label: "简体中文", shortLabel: "简" },
  { value: "en", label: "English", shortLabel: "EN" }
];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "zh-CN" || value === "en";
}

export function readStoredAppLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "zh-CN";
  }

  const stored = window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
  return isAppLanguage(stored) ? stored : "zh-CN";
}

export function writeStoredAppLanguage(language: AppLanguage) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
}

type Dictionary = {
  app: {
    name: string;
    loading: string;
    languageLabel: string;
  };
  common: {
    cancel: string;
    close: string;
    save: string;
    create: string;
    confirm: string;
    search: string;
    systemFolder: string;
    emptyValue: string;
    originalContentRequired: string;
  };
    sidebar: {
      title: string;
      subtitle: string;
      newRecord: string;
      searchPlaceholder: string;
    filters: {
      all: string;
      recent: string;
      unorganized: string;
      needsReview: string;
      reviewLater: string;
    };
      systemSection: string;
      systemFolderDescription: string;
      recordCount: (count: number) => string;
      expandSubFilters: string;
      collapseSubFilters: string;
      folders: string;
      tags: string;
      create: string;
      emptyFoldersTitle: string;
      emptyFoldersDescription: string;
      emptyTagsTitle: string;
    rename: string;
    delete: string;
    export: string;
  };
  list: {
    title: string;
    resultCount: (count: number) => string;
    createdAt: string;
  };
  empty: {
    noSelectionTitle: string;
    noSelectionDescription: string;
    searchTitle: string;
    searchDescription: string;
    systemFolderTitle: string;
    systemFolderDescription: string;
    folderTitle: string;
    folderDescription: string;
    tagTitle: string;
    tagDescription: string;
    unorganizedTitle: string;
    unorganizedDescription: string;
    notStartedTitle: string;
    notStartedDescription: string;
    needsReviewTitle: string;
    needsReviewDescription: string;
    reviewLaterTitle: string;
    reviewLaterDescription: string;
    allTitle: string;
    allDescription: string;
  };
    detail: {
      basicInfo: string;
      supportingInfo: string;
      moreMetadata: string;
      recordSummaryStatusPending: string;
      recordSummaryStatusOrganized: string;
      recordSummaryStatusReviewLater: string;
      recordEntryUpload: string;
      recordEntryLink: string;
      recordEntryBrowserImport: string;
      recordEntryPastedText: string;
      recordEntryManual: string;
      classification: string;
      sourcePlatform: string;
      sourceType: string;
      sourceSummary: string;
      sourceSummaryLink: string;
      sourceSummaryBrowser: string;
      sourceSummaryHtml: string;
      sourceSummaryOcr: string;
      sourceSummaryHtmlAndOcr: string;
      sourceSummaryTranscript: string;
      sourceSummaryManual: string;
      sourceSummaryChangedMaybe: string;
      sourceSummaryMetaOnly: string;
      transcriptionStatus: string;
      createdAt: string;
      updatedAt: string;
    originalUrl: string;
    watchedAt: string;
    folder: string;
    tags: string;
    originalContent: string;
    originalContentPlaceholder: string;
      aiPanel: string;
      concise: string;
      learning: string;
      aiStatusProcessing: string;
      aiStatusFailed: string;
      startAnalyze: string;
      startAnalyzeAfterContent: string;
      retryAnalyze: string;
      analyzingMode: (modeLabel: string) => string;
      analyzingDescription: (modeLabel: string) => string;
      aiLoadingNoticeTitle: string;
      aiRefreshingNoticeTitle: string;
      aiRefreshingNoticeDescription: (modeLabel: string) => string;
      keepPreviousResult: string;
      latestAnalyzeFailed: string;
      reviewNoticeTitle: string;
      reviewReasonSourceTextNeedsReview: string;
      reviewActionEditSourceText: string;
      reviewActionRetryAnalyze: string;
      reviewSourceLocal: string;
      updatedJustNow: string;
      viewOriginal: string;
      generatedAt: string;
      noAiResult: string;
      noAiResultDescription: string;
      noAiResultNeedsSource: string;
      noAiResultNeedsSourceDescription: string;
    personalNote: string;
    personalNotePlaceholder: string;
    reviewLaterLabel: string;
    reviewLaterHint: string;
    addToReviewLater: string;
    removeFromReviewLater: string;
    resumeTranscription: string;
    resumeTranscriptionLoading: string;
    resumeTranscriptionHint: string;
    resumeTranscriptionError: string;
    resumeTranscriptionErrorRequestFailed: string;
    resumeTranscriptionErrorNoImportResult: string;
    resumeTranscriptionErrorNoDetectedContent: string;
    resumeTranscriptionErrorPatchFailed: string;
    transcriptionStatusReadyToOrganize: string;
    actions: string;
    exportPdf: string;
    deleteRecord: string;
    title: string;
    transcriptMetadata: string;
    mediaAsset: {
      title: string;
      storageMode: string;
      availability: string;
      fileSize: string;
    };
    fileName: string;
    fileType: string;
    duration: string;
    language: string;
    segments: string;
    timestamps: string;
    noTranscriptAvailable: string;
    aiPreview: string;
    aiEdit: string;
    summary: string;
    bullets: string;
    coreConclusion: string;
    logicFramework: string;
    keyDetails: string;
    reusablePoints: string;
    previewHint: string;
    legend: {
      primary: string;
      secondary: string;
    };
    resizeSidebar: string;
    resizeList: string;
  };
  modals: {
    createRecordEyebrow: string;
    createRecordTitle: string;
      inputMethods: {
        upload: string;
        link: string;
        text: string;
        manual: string;
    };
    modeHelpers: Record<
      "upload" | "paste_text" | "blank" | "paste_link" | "browser_import",
      string
    >;
    createRecordCta: Record<
      "upload" | "paste_text" | "blank" | "paste_link" | "browser_import",
      string
    >;
    uploadTitle: string;
    uploadDescription: string;
    uploadInputLabel: string;
    uploadHint: (sizeLimitMb: number, minutes: number) => string;
    uploadStatusCardTitle: string;
    uploadCurrentStatus: string;
    uploadCurrentStep: string;
    uploadSteps: string;
    uploadWorkflowLabelUpload: string;
    uploadWorkflowLabelTranscribe: string;
    uploadWorkflowLabelProcess: string;
    uploadWorkflowVideoHelper: string;
    archiveModePlaceholderTitle: string;
    archiveModePlaceholderDescription: string;
    archiveModePlaceholderAction: string;
    failureStagePrefix: string;
    failureStageLabel: {
      upload: string;
      preprocessing: string;
      transcription: string;
      unknown: string;
    };
    uploadModelUsed: string;
    uploadModelAttempts: string;
    uploadModelFallback: string;
    uploadFileSelected: string;
    uploadProcessingDescription: string;
    uploadSuccessDescription: string;
    uploadFailureDescription: string;
    uploadTimeoutDescription: string;
    uploadLargeFileHint: string;
    uploadFileSize: string;
    uploadStateLabel: Record<Exclude<UploadUiStatus, "idle">, string>;
    otherImportMethods: string;
    originalTranscript: string;
    retryTranscription: string;
    transcriptionStatus: Record<TranscriptionStatus, string>;
    transcriptMetadata: string;
    fileName: string;
    fileType: string;
    duration: string;
    language: string;
    segments: string;
    timestamps: string;
    optionalTitle: string;
    optionalTitlePlaceholder: string;
    originalUrl: string;
    content: string;
    manualContent: string;
    blankContentLabel: string;
    pasteTextContentLabel: string;
    contentPlaceholder: string;
    blankContentPlaceholder: string;
    pasteTextContentPlaceholder: string;
    linkContentPlaceholder: string;
    repairShortcut: {
      title: string;
      description: string;
      action: string;
    };
    folder: string;
    tags: string;
    tagsPlaceholder: (sample: string | null) => string;
    bilibiliImport: {
      loading: string;
      success: string;
      invalidUrl: string;
      videoInfoUnavailable: string;
      subtitleListUnavailable: string;
      subtitleTrackUnavailable: string;
      subtitleUnavailable: string;
      requestFailed: string;
      fallbackHint: string;
      trackSelectLabel: string;
      trackSelectHint: string;
      debugLabel: string;
      fetchStrategyLabel: string;
      trackCountLabel: (count: number) => string;
      cookieUsed: string;
      cookieMissing: string;
    };
    linkImport: {
      title: string;
      description: string;
      idleHint: string;
      trigger: string;
      partialHelper: string;
      insufficientHelper: string;
      failedHelper: string;
    };
    browserImport: {
      trigger: string;
      waitingTitle: string;
      waitingDescription: string;
      syncing: string;
      ready: string;
      incomplete: string;
      failed: string;
    };
    createRecord: string;
    manageFolderCreate: string;
    manageFolderRename: string;
    manageTagCreate: string;
    manageTagRename: string;
    folderDescription: string;
    tagDescription: string;
    folderName: string;
    tagName: string;
    folderNamePlaceholder: string;
    tagNamePlaceholder: string;
    nameRequired: string;
    nameTooLong: string;
  };
  mediaAsset: {
    storageMode: Record<"none" | "local_archive_dir", string>;
    availability: Record<"ready" | "missing" | "permission_required" | "write_failed" | "not_archived", string>;
    availabilityDescription: Record<
      "ready" | "missing" | "permission_required" | "write_failed" | "not_archived",
      string
    >;
  };
  confirm: {
    defaultTitle: string;
    deleteFolderTitle: (name: string) => string;
    deleteFolderDescription: string;
    deleteTagTitle: (name: string) => string;
    deleteTagDescription: string;
    deleteRecordTitle: (name: string) => string;
    deleteRecordDescription: string;
    deleteRecordConfirm: string;
    deleteConfirm: string;
  };
  export: {
    folderExportTitle: (name: string) => string;
    noAiResult: string;
    conciseTitle: string;
    learningTitle: string;
    originalContent: string;
    personalNote: string;
    platform: string;
    folder: string;
    tags: string;
    originalUrl: string;
    createdAt: string;
    updatedAt: string;
    watchedAt: string;
    summary: string;
    bullets: string;
    coreConclusion: string;
    logicFramework: string;
    keyDetails: string;
    reusablePoints: string;
    emptyFolder: string;
  };
  errors: {
    duplicateFolder: string;
    duplicateTag: string;
    rawTextRequired: string;
    textTooShort: (min: number) => string;
    aiResponseInvalid: string;
    aiRequestFailed: string;
    unsupportedFileFormat: string;
    fileTooLarge: (sizeLimitMb: number) => string;
    transcriptionTimeout: string;
    transcriptionQuotaExceeded: string;
    transcriptionFailed: string;
    youCanContinueEditingManually: string;
    noTranscriptAvailable: string;
    internalError: string;
  };
  analysisStatus: {
    needsReview: string;
  };
  status: Record<AIStatus, string>;
  transcriptionStatus: Record<TranscriptionStatus, string>;
  platform: Record<SourcePlatform, string>;
  sourceType: Record<SourceType, string>;
  highlightTone: Record<HighlightTone, string>;
};

export type MessageDictionary = Dictionary;

export const messages: Record<AppLanguage, Dictionary> = {
  "zh-CN": {
    app: {
      name: "音视频知识归档器",
      loading: "正在初始化本地数据…",
      languageLabel: "语言"
    },
    common: {
      cancel: "取消",
      close: "关闭",
      save: "保存",
      create: "新建",
      confirm: "确认",
      search: "搜索",
      systemFolder: "未分类记录",
      emptyValue: "—",
      originalContentRequired: "原始内容为空，请先补充内容再整理。"
    },
    sidebar: {
      title: "Knowledge Archiver",
      subtitle: "音视频知识归档器",
      newRecord: "新建记录",
      searchPlaceholder: "搜索标题、内容、AI、备注、标签",
      filters: {
        all: "全部记录",
        recent: "最近新增",
        unorganized: "待处理",
        needsReview: "整理待复核",
        reviewLater: "需复查"
      },
      systemSection: "系统入口",
      systemFolderDescription: "尚未归档到任何文件夹的内容会显示在这里",
      recordCount: (count) => `${count} 条记录`,
      expandSubFilters: "展开子状态",
      collapseSubFilters: "收起子状态",
      folders: "文件夹",
      tags: "标签",
      create: "新建",
      emptyFoldersTitle: "暂无文件夹",
      emptyFoldersDescription: "新建后会显示在这里。",
      emptyTagsTitle: "暂无标签",
      rename: "重命名",
      delete: "删除",
      export: "导出"
    },
    list: {
      title: "记录列表",
      resultCount: (count) => `${count} 条结果`,
      createdAt: "录入时间"
    },
    empty: {
      noSelectionTitle: "选择一条记录",
      noSelectionDescription: "左边负责找，中间负责选，右边负责做。",
      searchTitle: "搜索无结果",
      searchDescription: "换个关键词试试，或者补充更完整的原始内容。",
      systemFolderTitle: "当前没有未分类记录",
      systemFolderDescription: "新添加但尚未归档的内容会出现在这里",
      folderTitle: "当前文件夹为空",
      folderDescription: "这个文件夹还没有记录，可以先新建一条。",
      tagTitle: "当前标签无记录",
      tagDescription: "给记录添加这个标签后，它们会出现在这里。",
      unorganizedTitle: "暂无待处理记录",
      unorganizedDescription: "尚未开始、整理待复核或等待处理的失败记录会显示在这里。",
      notStartedTitle: "暂无未开始记录",
      notStartedDescription: "尚未开始处理的记录会显示在这里。",
      needsReviewTitle: "暂无整理待复核记录",
      needsReviewDescription: "已有原文但当前仍需先复核再整理的记录会显示在这里。",
      reviewLaterTitle: "暂无需复查记录",
      reviewLaterDescription: "你手动加入需复查队列的记录会显示在这里。",
      allTitle: "暂无记录",
      allDescription: "先从左上角新建一条记录开始。"
    },
    detail: {
      basicInfo: "基础信息",
      classification: "分类",
      sourcePlatform: "来源平台",
      sourceType: "来源类型",
      sourceSummary: "来源摘要",
      sourceSummaryLink: "主要来自链接导入",
      sourceSummaryBrowser: "主要来自浏览器导入",
      sourceSummaryHtml: "主要来自网页正文",
      sourceSummaryOcr: "主要来自 OCR 补充",
      sourceSummaryHtmlAndOcr: "主要来自网页正文 + OCR 补充",
      sourceSummaryTranscript: "主要来自音视频转写",
      sourceSummaryManual: "主要来自用户手动输入",
      sourceSummaryChangedMaybe: "当前原文可能与初次导入结果不同，也可能包含后续补充或调整。",
      sourceSummaryMetaOnly: "当前仅带回摘要级内容，不等于完整正文。",
      transcriptionStatus: "转写状态",
      createdAt: "录入时间",
      updatedAt: "更新时间",
      originalUrl: "原始链接",
      watchedAt: "观看时间",
      folder: "文件夹",
      tags: "标签",
      originalContent: "原始内容",
      originalContentPlaceholder: "请粘贴字幕、笔记或你补充的正文内容。AI 只能基于这里的文本整理。",
      aiPanel: "AI 整理区",
      concise: "简洁版",
      learning: "学习版",
      aiStatusProcessing: "AI 整理中",
      aiStatusFailed: "AI 整理失败",
      startAnalyze: "开始整理",
      startAnalyzeAfterContent: "先补充内容",
      retryAnalyze: "重新整理",
      analyzingMode: (modeLabel) => `正在整理${modeLabel}…`,
      analyzingDescription: (modeLabel) => `正在生成${modeLabel}结果，请稍候。`,
      aiLoadingNoticeTitle: "请稍候",
      aiRefreshingNoticeTitle: "当前结果已保留",
      aiRefreshingNoticeDescription: (modeLabel) => `正在生成新的${modeLabel}结果，请稍候。`,
      keepPreviousResult: "本次整理完成前，当前结果会继续保留。",
      latestAnalyzeFailed: "本次整理失败，当前结果已保留。",
      reviewNoticeTitle: "这次先不生成整理结果",
      reviewReasonSourceTextNeedsReview: "当前原文还不足以稳定生成这一模式的整理结果，建议先补充或澄清原文。",
      reviewActionEditSourceText: "建议先补充原文，再重新整理。",
      reviewActionRetryAnalyze: "可在确认原文后再次发起整理。",
      reviewSourceLocal: "这次由本地决策先拦截，尚未调用模型。",
      updatedJustNow: "刚刚更新",
      viewOriginal: "查看 AI 原始版",
      generatedAt: "生成时间",
      noAiResult: "还没有该模式的整理结果。",
      noAiResultDescription: "点击“开始整理”生成内容。",
      noAiResultNeedsSource: "请先补充原始内容。",
      noAiResultNeedsSourceDescription: "补充正文后再开始整理，AI 才能基于这里的文本生成结果。",
      personalNote: "个人备注",
      personalNotePlaceholder: "记录你自己的观察、行动项或后续想法。",
      reviewLaterLabel: "需复查队列",
      reviewLaterHint: "把这条记录加入你稍后回来处理的队列。",
      addToReviewLater: "加入需复查队列",
      removeFromReviewLater: "取消加入需复查队列",
      resumeTranscription: "继续转写",
      resumeTranscriptionLoading: "继续转写中…",
      resumeTranscriptionHint: "将复用已保存链接，无需重新输入。",
      resumeTranscriptionError: "这次未能继续转写，请稍后重试。",
      resumeTranscriptionErrorRequestFailed: "恢复请求失败，请稍后重试。",
      resumeTranscriptionErrorNoImportResult: "没有拿到可继续的导入结果，请稍后重试。",
      resumeTranscriptionErrorNoDetectedContent: "导入结果返回了，但没有抓到正文。",
      resumeTranscriptionErrorPatchFailed: "正文拿到了，但保存回当前记录失败。",
      transcriptionStatusReadyToOrganize: "待整理",
      actions: "操作",
      exportPdf: "导出 PDF",
      deleteRecord: "删除记录",
      title: "标题",
      supportingInfo: "辅助信息",
      moreMetadata: "更多信息",
      recordSummaryStatusPending: "未整理",
      recordSummaryStatusOrganized: "已整理",
      recordSummaryStatusReviewLater: "需复查",
      recordEntryUpload: "上传文件",
      recordEntryLink: "链接导入",
      recordEntryBrowserImport: "浏览器导入",
      recordEntryPastedText: "粘贴文本",
      recordEntryManual: "手动输入",
      transcriptMetadata: "转写元信息",
      mediaAsset: {
        title: "媒体资产",
        storageMode: "存储模式",
        availability: "媒体状态",
        fileSize: "文件大小"
      },
      fileName: "文件名",
      fileType: "文件类型",
      duration: "时长",
      language: "语言",
      segments: "分段",
      timestamps: "时间戳",
      noTranscriptAvailable: "暂无可用转写文本。",
      aiPreview: "阅读视图",
      aiEdit: "编辑结果",
      summary: "摘要",
      bullets: "要点",
      coreConclusion: "核心结论",
      logicFramework: "逻辑框架",
      keyDetails: "关键细节",
      reusablePoints: "可复用点",
      previewHint: "AI 结果会用少量句内重点标亮，方便快速扫读。",
      legend: {
        primary: "主重点",
        secondary: "辅助重点"
      },
      resizeSidebar: "调整左栏宽度",
      resizeList: "调整中栏宽度"
    },
    modals: {
      createRecordEyebrow: "新建记录",
      createRecordTitle: "录入新的内容线索",
      inputMethods: {
        upload: "上传文件",
        link: "粘贴链接",
        text: "输入或粘贴文本",
        manual: "空白新建"
      },
      modeHelpers: {
        upload: "上传单个音视频文件，并在转写完成后继续编辑原始内容。",
        paste_text: "输入或粘贴已有文本、字幕或笔记，直接进入后续整理。",
        blank: "从空白开始写一条记录，适合先记下线索，再逐步补全内容。",
        paste_link: "链接模式会先尝试提取内容。",
        browser_import: "通过浏览器扩展辅助导入当前页面上下文，再检查并补全文本内容。"
      },
      createRecordCta: {
        upload: "创建记录",
        paste_text: "创建记录",
        blank: "创建记录",
        paste_link: "创建记录",
        browser_import: "创建记录"
      },
      uploadTitle: "上传视频或音频",
      uploadDescription: "上传单个音视频文件，系统会先转写，再把文本填入唯一的原始内容编辑区。",
      uploadInputLabel: "选择视频或音频文件",
      uploadHint: (sizeLimitMb, minutes) =>
        `P0 仅支持单文件上传，建议上传 ${minutes} 分钟内、${sizeLimitMb}MB 以内的音视频。`,
      uploadStatusCardTitle: "转写状态卡片",
      uploadCurrentStatus: "当前状态",
      uploadCurrentStep: "当前步骤",
      uploadSteps: "处理步骤",
      uploadWorkflowLabelUpload: "上传",
      uploadWorkflowLabelTranscribe: "转写",
      uploadWorkflowLabelProcess: "处理",
      uploadWorkflowVideoHelper: "处理包含提取音频与转写。",
      archiveModePlaceholderTitle: "本地归档目录",
      archiveModePlaceholderDescription: "后续版本将支持把原始音视频保存到本地归档目录，并在详情页中重新回看。",
      archiveModePlaceholderAction: "即将支持",
      failureStagePrefix: "失败阶段",
      failureStageLabel: {
        upload: "上传",
        preprocessing: "预处理",
        transcription: "转写",
        unknown: "未知阶段"
      },
      uploadModelUsed: "转写模型",
      uploadModelAttempts: "转写尝试模型",
      uploadModelFallback: "自动回退",
      uploadFileSelected: "已选择文件",
      uploadProcessingDescription: "系统已开始处理，请稍候，原始内容区会在转写完成后自动填入。",
      uploadSuccessDescription: "转写完成，已自动填入原始内容区。",
      uploadFailureDescription: "转写失败，请重试或手动补充内容。",
      uploadTimeoutDescription: "处理超时，请重试。",
      uploadLargeFileHint: "文件较大，处理可能需要更久。",
      uploadFileSize: "文件大小",
      uploadStateLabel: {
        uploading: "上传中",
        processing: "处理中",
        success: "转写完成",
        timeout: "处理超时",
        too_large: "文件过大",
        failed: "转写失败"
      },
      otherImportMethods: "其他导入方式",
      originalTranscript: "原始转写文本",
      retryTranscription: "重新转写",
      transcriptionStatus: {
        idle: "未开始",
        file_uploaded: "文件已上传",
        extracting_audio: "正在提取音频",
        transcribing: "正在转写",
        transcript_ready: "转写已就绪",
        transcript_needs_review: "转写待校对",
        transcript_failed: "转写失败"
      },
      transcriptMetadata: "转写元信息",
      fileName: "文件名",
      fileType: "文件类型",
      duration: "时长",
      language: "语言",
      segments: "分段",
      timestamps: "时间戳",
      optionalTitle: "标题（可选）",
      optionalTitlePlaceholder: "不填会自动生成临时标题",
      originalUrl: "原始链接",
      content: "原始内容 / 字幕 / 备注",
      manualContent: "原始内容（可稍后补充）",
      blankContentLabel: "起始内容",
      pasteTextContentLabel: "输入或粘贴文本",
      contentPlaceholder: "AI 只能基于这里的文本整理。链接模式下也建议补充正文、字幕或笔记。",
      blankContentPlaceholder: "从空白开始写下你当前掌握的线索、片段或问题。",
      pasteTextContentPlaceholder: "输入或粘贴已有文本、字幕、摘录或笔记，AI 会基于这里的内容继续整理。",
      linkContentPlaceholder: "可补充正文、字幕或笔记。当前链接模式下，AI 仍主要基于这里的文本整理。",
      repairShortcut: {
        title: "导入内容还有缺口",
        description: "先补正文，标题也可以顺手修正。",
        action: "继续补正文"
      },
      folder: "文件夹",
      tags: "标签（逗号分隔，可选）",
      tagsPlaceholder: (sample) => (sample ? `例如：${sample}` : "例如：职场, 运营"),
      bilibiliImport: {
        loading: "正在尝试提取 B 站字幕…",
        success: "已提取可用字幕，已自动填入原始内容。",
        invalidUrl: "未识别到有效的 B 站视频链接，请检查链接格式。",
        videoInfoUnavailable: "暂时无法解析该视频信息，请手动补充正文或笔记。",
        subtitleListUnavailable: "已拿到视频信息，但未能完整读取字幕轨列表。",
        subtitleTrackUnavailable: "检测到字幕轨，但当前选中的轨道不可下载或内容为空。",
        subtitleUnavailable: "该视频未提供可用字幕，请手动补充正文、字幕或笔记。",
        requestFailed: "自动提取字幕失败，请稍后重试或手动补充正文。",
        fallbackHint: "即使自动提取失败，也可以保留链接先创建记录。",
        trackSelectLabel: "字幕轨道",
        trackSelectHint: "如果播放器里有多条字幕，可在这里切换导入轨道。",
        debugLabel: "探测信息",
        fetchStrategyLabel: "探测策略",
        trackCountLabel: (count) => `共探测到 ${count} 条字幕轨`,
        cookieUsed: "已携带 B 站 cookie",
        cookieMissing: "当前为匿名请求"
      },
      linkImport: {
        title: "链接辅助导入",
        description: "提取结果、缺口和 warning 会显示在这里。",
        idleHint: "输入链接后，可在这里查看提取结果、缺口和提示。",
        trigger: "尝试提取链接内容",
        partialHelper: "当前只拿到部分可整理文本，建议在下方继续补充原始内容。",
        insufficientHelper: "当前只拿到标题或摘要，建议在下方补充正文。",
        failedHelper: "未能自动提取可用正文，但仍可在下方手动补充后继续创建记录。"
      },
      browserImport: {
        trigger: "浏览器导入（Beta）",
        waitingTitle: "浏览器导入已启动",
        waitingDescription: "请前往当前 B 站视频页并点击侧载扩展，扩展会把页面上下文提交回归档器。",
        syncing: "已收到浏览器导入内容，正在同步表单。",
        ready: "浏览器导入已就绪，可直接检查并创建记录。",
        incomplete: "浏览器导入已完成，但正文仍不足，建议补充字幕或笔记。",
        failed: "浏览器导入未完成，但你仍可继续创建记录并手动补录内容。"
      },
      createRecord: "创建记录",
      manageFolderCreate: "新建文件夹",
      manageFolderRename: "重命名文件夹",
      manageTagCreate: "新建标签",
      manageTagRename: "重命名标签",
      folderDescription: "文件夹用于主归档，一条记录只能属于一个文件夹。",
      tagDescription: "标签可用于跨文件夹组织记录。",
      folderName: "文件夹名称",
      tagName: "标签名称",
      folderNamePlaceholder: "输入文件夹名称",
      tagNamePlaceholder: "输入标签名称",
      nameRequired: "名称不能为空",
      nameTooLong: "名称请控制在 40 字以内"
    },
    mediaAsset: {
      storageMode: {
        none: "未归档",
        local_archive_dir: "本地归档目录"
      },
      availability: {
        ready: "媒体可用",
        missing: "媒体已缺失",
        permission_required: "需要重新授权",
        write_failed: "归档失败",
        not_archived: "未保留原始媒体"
      },
      availabilityDescription: {
        ready: "媒体已归档，可用于后续回看。",
        missing: "原始媒体已缺失，无法播放，但文本归档仍然保留。",
        permission_required: "需要重新授权归档目录后才能访问媒体文件。",
        write_failed: "媒体归档失败，本记录目前只保留文本与整理结果。",
        not_archived: "当前记录未保留原始媒体，仅保存文本归档与相关元信息。"
      }
    },
    confirm: {
      defaultTitle: "确认操作",
      deleteFolderTitle: (name) => `删除文件夹「${name}」`,
      deleteFolderDescription: "该文件夹下的记录会被移回“未分类记录”，删除后不可恢复。",
      deleteTagTitle: (name) => `删除标签「${name}」`,
      deleteTagDescription: "该标签会从所有记录中移除，删除后不可恢复。",
      deleteRecordTitle: (name) => `删除记录「${name}」`,
      deleteRecordDescription: "删除后这条记录及其 AI 结果会从本地永久移除。",
      deleteRecordConfirm: "确认删除记录",
      deleteConfirm: "确认删除"
    },
    export: {
      folderExportTitle: (name) => `${name} 导出`,
      noAiResult: "暂无 AI 整理结果",
      conciseTitle: "AI 整理结果（简洁版）",
      learningTitle: "AI 整理结果（学习版）",
      originalContent: "原始内容",
      personalNote: "个人备注",
      platform: "平台",
      folder: "文件夹",
      tags: "标签",
      originalUrl: "原始链接",
      createdAt: "录入时间",
      updatedAt: "更新时间",
      watchedAt: "观看时间",
      summary: "摘要",
      bullets: "要点",
      coreConclusion: "核心结论",
      logicFramework: "逻辑框架",
      keyDetails: "关键细节",
      reusablePoints: "可复用点",
      emptyFolder: "当前文件夹暂无记录。"
    },
    errors: {
      duplicateFolder: "已存在同名文件夹，请换一个名称。",
      duplicateTag: "已存在同名标签，请换一个名称。",
      rawTextRequired: "原始内容不能为空，请先补充内容。",
      textTooShort: (min) => `原始内容过短，至少需要 ${min} 个字符。`,
      aiResponseInvalid: "AI 返回结果格式异常，请稍后重试。",
      aiRequestFailed: "AI 请求失败，请检查服务状态后重试。",
      unsupportedFileFormat: "文件格式不受支持，请上传音频或视频文件。",
      fileTooLarge: (sizeLimitMb) => `文件过大，请上传 ${sizeLimitMb}MB 以内的单个文件。`,
      transcriptionTimeout: "处理超时，请重试。",
      transcriptionQuotaExceeded: "当前 AI 转写额度已用尽，请稍后重试或更换可用配置。",
      transcriptionFailed: "转写失败，请重试。",
      youCanContinueEditingManually: "你仍可继续手动编辑原始内容。",
      noTranscriptAvailable: "暂无可用转写文本。",
      internalError: "整理时出现异常，请稍后再试。"
    },
    analysisStatus: {
      needsReview: "整理待复核"
    },
    status: {
      not_started: "未整理",
      processing: "整理中",
      done: "已整理",
      needs_review: "需复核",
      failed: "整理失败"
    },
    transcriptionStatus: {
      idle: "未开始",
      file_uploaded: "文件已上传",
      extracting_audio: "正在提取音频",
      transcribing: "正在转写",
      transcript_ready: "转写已就绪",
      transcript_needs_review: "待修正文稿",
      transcript_failed: "转写失败"
    },
    platform: {
      tiktok: "TikTok",
      bilibili: "B站",
      xiaohongshu: "小红书",
      other: "其他",
      unknown: "未知"
    },
    sourceType: {
      video: "视频",
      audio: "音频",
      text: "文本",
      link: "链接",
      manual: "手动"
    },
    highlightTone: {
      core: "核心",
      method: "方法",
      action: "执行",
      warning: "提醒"
    }
  },
  en: {
    app: {
      name: "Audio & Video Knowledge Archiver",
      loading: "Initializing local data…",
      languageLabel: "Language"
    },
    common: {
      cancel: "Cancel",
      close: "Close",
      save: "Save",
      create: "Create",
      confirm: "Confirm",
      search: "Search",
      systemFolder: "Uncategorized Records",
      emptyValue: "—",
      originalContentRequired: "Original content is empty. Add content before running AI."
    },
    sidebar: {
      title: "Knowledge Archiver",
      subtitle: "Audio & Video Knowledge Archiver",
      newRecord: "New record",
      searchPlaceholder: "Search titles, content, AI, notes, or tags",
      filters: {
        all: "All records",
        recent: "Recently added",
        unorganized: "Needs attention",
        needsReview: "Analysis Needs Review",
        reviewLater: "Review later"
      },
      systemSection: "System",
      systemFolderDescription: "Content that has not been archived into any folder appears here.",
      recordCount: (count) => `${count} records`,
      expandSubFilters: "Expand sub-statuses",
      collapseSubFilters: "Collapse sub-statuses",
      folders: "Folders",
      tags: "Tags",
      create: "New",
      emptyFoldersTitle: "No folders yet",
      emptyFoldersDescription: "Create one and it will appear here.",
      emptyTagsTitle: "No tags yet",
      rename: "Rename",
      delete: "Delete",
      export: "Export"
    },
    list: {
      title: "Records",
      resultCount: (count) => `${count} results`,
      createdAt: "Created"
    },
    empty: {
      noSelectionTitle: "Select a record",
      noSelectionDescription: "Browse on the left, choose in the middle, work on the right.",
      searchTitle: "No search results",
      searchDescription: "Try another keyword or add more source content.",
      systemFolderTitle: "There are no uncategorized records right now",
      systemFolderDescription: "Newly added content that has not been archived yet will appear here.",
      folderTitle: "This folder is empty",
      folderDescription: "Create a record and it will show up here.",
      tagTitle: "No records with this tag",
      tagDescription: "Add this tag to records and they will appear here.",
      unorganizedTitle: "No records need attention",
      unorganizedDescription:
        "Records that have not started yet, still need analysis review, or failed and need another pass will appear here.",
      notStartedTitle: "No records have not started yet",
      notStartedDescription: "Records that have not started processing yet will appear here.",
      needsReviewTitle: "No analysis review records",
      needsReviewDescription: "Records with source text that still need analysis review will appear here.",
      reviewLaterTitle: "Nothing queued for later review",
      reviewLaterDescription: "Records you manually add to the review-later queue will appear here.",
      allTitle: "No records yet",
      allDescription: "Start by creating a record from the top-left corner."
    },
    detail: {
      basicInfo: "Basic info",
      classification: "Classification",
      sourcePlatform: "Source platform",
      sourceType: "Source type",
      sourceSummary: "Source summary",
      sourceSummaryLink: "Mainly from link import",
      sourceSummaryBrowser: "Mainly from browser import",
      sourceSummaryHtml: "Mainly from web page text",
      sourceSummaryOcr: "Mainly from OCR-added text",
      sourceSummaryHtmlAndOcr: "Mainly from web page text plus OCR-added text",
      sourceSummaryTranscript: "Mainly from audio or video transcription",
      sourceSummaryManual: "Mainly from manual input",
      sourceSummaryChangedMaybe:
        "The current source text may differ from the initial import result and may include later adjustments.",
      sourceSummaryMetaOnly: "Only summary-level content was brought back, not a full body text.",
      transcriptionStatus: "Transcription status",
      createdAt: "Created",
      updatedAt: "Updated",
      originalUrl: "Original URL",
      watchedAt: "Watched at",
      folder: "Folder",
      tags: "Tags",
      originalContent: "Source content",
      originalContentPlaceholder: "Paste subtitles, notes, or supporting text here. AI only works from this source text.",
      aiPanel: "AI workspace",
      concise: "Concise",
      learning: "Learning",
      aiStatusProcessing: "AI generating",
      aiStatusFailed: "AI failed",
      startAnalyze: "Analyze",
      startAnalyzeAfterContent: "Add source content first",
      retryAnalyze: "Analyze again",
      analyzingMode: (modeLabel) => `Generating ${modeLabel}…`,
      analyzingDescription: (modeLabel) => `Generating the ${modeLabel} result. This panel will update when the new version is ready.`,
      aiLoadingNoticeTitle: "Please wait",
      aiRefreshingNoticeTitle: "The current result stays visible",
      aiRefreshingNoticeDescription: (modeLabel) =>
        `A new ${modeLabel} result is being generated. Please wait a moment.`,
      keepPreviousResult: "The previous result stays visible while this request runs.",
      latestAnalyzeFailed: "The latest analysis failed. Your previous result is still available.",
      reviewNoticeTitle: "No AI result was generated yet",
      reviewReasonSourceTextNeedsReview:
        "The current source text is still not stable enough for this mode. Add or clarify the source text first.",
      reviewActionEditSourceText: "Recommended next step: improve the source text, then run AI again.",
      reviewActionRetryAnalyze: "You can run AI again after confirming the source text.",
      reviewSourceLocal: "This pass was stopped by a local decision before calling the model.",
      updatedJustNow: "Updated just now",
      viewOriginal: "Show original AI result",
      generatedAt: "Generated",
      noAiResult: "No result for this mode yet.",
      noAiResultDescription: "Run AI to generate a structured summary.",
      noAiResultNeedsSource: "Add source content first.",
      noAiResultNeedsSourceDescription:
        "AI can only organize what is already in the source content field. Add that content first, then run AI.",
      personalNote: "Personal notes",
      personalNotePlaceholder: "Capture your observations, next steps, or follow-up ideas.",
      reviewLaterLabel: "Review-later queue",
      reviewLaterHint: "Use this when you want to come back and finish this record later.",
      addToReviewLater: "Add to review-later queue",
      removeFromReviewLater: "Remove from review-later queue",
      resumeTranscription: "Continue transcription",
      resumeTranscriptionLoading: "Continuing transcription…",
      resumeTranscriptionHint: "This will reuse the saved link, so you do not need to paste it again.",
      resumeTranscriptionError: "We could not continue the transcription right now. Please try again later.",
      resumeTranscriptionErrorRequestFailed: "The resume request failed. Please try again later.",
      resumeTranscriptionErrorNoImportResult: "We could not get a resume-able import result. Please try again later.",
      resumeTranscriptionErrorNoDetectedContent: "We got an import result, but no body text could be extracted.",
      resumeTranscriptionErrorPatchFailed: "We extracted the body text, but failed to save it back to the record.",
      transcriptionStatusReadyToOrganize: "Ready to organize",
      actions: "Actions",
      exportPdf: "Export PDF",
      deleteRecord: "Delete record",
      title: "Title",
      supportingInfo: "Supporting info",
      moreMetadata: "More details",
      recordSummaryStatusPending: "Not organized",
      recordSummaryStatusOrganized: "Organized",
      recordSummaryStatusReviewLater: "Review later",
      recordEntryUpload: "Uploaded file",
      recordEntryLink: "Link import",
      recordEntryBrowserImport: "Browser import",
      recordEntryPastedText: "Pasted text",
      recordEntryManual: "Manual input",
      transcriptMetadata: "Transcript Metadata",
      mediaAsset: {
        title: "Media Asset",
        storageMode: "Storage Mode",
        availability: "Media Status",
        fileSize: "File Size"
      },
      fileName: "File Name",
      fileType: "File Type",
      duration: "Duration",
      language: "Language",
      segments: "Segments",
      timestamps: "Timestamps",
      noTranscriptAvailable: "No Transcript Available",
      aiPreview: "Reading view",
      aiEdit: "Edit result",
      summary: "Summary",
      bullets: "Key points",
      coreConclusion: "Core Conclusion",
      logicFramework: "Logic Framework",
      keyDetails: "Key Details",
      reusablePoints: "Reusable Points",
      previewHint: "AI results use sparse inline emphasis so the key phrases are faster to scan.",
      legend: {
        primary: "Primary focus",
        secondary: "Secondary cue"
      },
      resizeSidebar: "Resize sidebar",
      resizeList: "Resize record list"
    },
    modals: {
      createRecordEyebrow: "New record",
      createRecordTitle: "Capture a new content lead",
      inputMethods: {
        upload: "Upload File",
        link: "Paste link",
        text: "Type or paste text",
        manual: "Start Blank"
      },
      modeHelpers: {
        upload: "Upload a single media file and continue editing once the transcript is ready.",
        paste_text: "Type or paste existing text, subtitles, or notes and move straight into organization.",
        blank: "Start from an empty note when you only have a lead and want to fill in the source text later.",
        paste_link: "Link mode will try to extract content first.",
        browser_import: "Use the browser extension to bring page context back into the archiver, then review and complete the text."
      },
      createRecordCta: {
        upload: "Create record",
        paste_text: "Create record",
        blank: "Create record",
        paste_link: "Create record",
        browser_import: "Create record"
      },
      uploadTitle: "Upload Video or Audio",
      uploadDescription: "Upload one media file, transcribe it, then review the text in the existing Original Content editor.",
      uploadInputLabel: "Select a video or audio file",
      uploadHint: (sizeLimitMb, minutes) =>
        `P0 supports one file at a time. Use a file within ${minutes} minutes and ${sizeLimitMb}MB for the most stable result.`,
      uploadStatusCardTitle: "Transcription Status",
      uploadCurrentStatus: "Current Status",
      uploadCurrentStep: "Current Step",
      uploadSteps: "Workflow",
      uploadWorkflowLabelUpload: "Upload",
      uploadWorkflowLabelTranscribe: "Transcribe",
      uploadWorkflowLabelProcess: "Processing",
      uploadWorkflowVideoHelper: "Processing includes audio extraction and transcription.",
      archiveModePlaceholderTitle: "Local Archive Directory",
      archiveModePlaceholderDescription: "A later version will let you save original media into a local archive directory and reopen it from the detail view.",
      archiveModePlaceholderAction: "Coming Soon",
      failureStagePrefix: "Failure Stage",
      failureStageLabel: {
        upload: "Upload",
        preprocessing: "Preprocessing",
        transcription: "Transcription",
        unknown: "Unknown stage"
      },
      uploadModelUsed: "Transcription Model",
      uploadModelAttempts: "Transcription Model Attempts",
      uploadModelFallback: "Auto fallback",
      uploadFileSelected: "File Selected",
      uploadProcessingDescription: "Processing has started. Keep this window open while the transcript is prepared.",
      uploadSuccessDescription: "Transcription is complete and has been added to the Original Content field.",
      uploadFailureDescription: "Transcription failed. Please retry or add the content manually.",
      uploadTimeoutDescription: "Processing timed out. Please retry.",
      uploadLargeFileHint: "Larger files can take longer to process.",
      uploadFileSize: "File Size",
      uploadStateLabel: {
        uploading: "Uploading",
        processing: "Processing",
        success: "Transcription Complete",
        timeout: "Processing Timed Out",
        too_large: "File Too Large",
        failed: "Transcription Failed"
      },
      otherImportMethods: "Other import methods",
      originalTranscript: "Original Transcript",
      retryTranscription: "Retry Transcription",
      transcriptionStatus: {
        idle: "Idle",
        file_uploaded: "File Uploaded",
        extracting_audio: "Extracting Audio",
        transcribing: "Transcribing",
        transcript_ready: "Transcript Ready",
        transcript_needs_review: "Transcript Needs Review",
        transcript_failed: "Transcript Failed"
      },
      transcriptMetadata: "Transcript Metadata",
      fileName: "File Name",
      fileType: "File Type",
      duration: "Duration",
      language: "Language",
      segments: "Segments",
      timestamps: "Timestamps",
      optionalTitle: "Title (optional)",
      optionalTitlePlaceholder: "A temporary title will be generated if left blank",
      originalUrl: "Original URL",
      content: "Source content / subtitles / notes",
      manualContent: "Source content (optional for now)",
      blankContentLabel: "Starting notes",
      pasteTextContentLabel: "Type or paste text",
      contentPlaceholder: "AI only uses the text here. Even in link mode, it helps to paste notes, subtitles, or source text.",
      blankContentPlaceholder: "Start from a blank note and capture the clues, fragments, or questions you already have.",
      pasteTextContentPlaceholder: "Type or paste existing text, subtitles, excerpts, or notes. AI will organize what you provide here.",
      linkContentPlaceholder: "Add body text, subtitles, or notes here. In link mode, AI still depends mainly on this text.",
      repairShortcut: {
        title: "This import still has gaps",
        description: "Start with the body text, and tweak the title if needed.",
        action: "Continue to body"
      },
      folder: "Folder",
      tags: "Tags (comma separated, optional)",
      tagsPlaceholder: (sample) => (sample ? `For example: ${sample}` : "For example: career, growth"),
      bilibiliImport: {
        loading: "Trying to extract Bilibili subtitles…",
        success: "Subtitles were imported and filled into the source content field.",
        invalidUrl: "This does not look like a valid Bilibili video link.",
        videoInfoUnavailable: "The video metadata could not be resolved right now. Add notes manually instead.",
        subtitleListUnavailable: "The video was resolved, but the subtitle track list could not be read completely.",
        subtitleTrackUnavailable: "A subtitle track was detected, but the selected track could not be downloaded or was empty.",
        subtitleUnavailable:
          "This video does not provide usable subtitles. You can still create the record and add notes manually.",
        requestFailed: "Subtitle extraction failed. Please try again later or add the transcript manually.",
        fallbackHint: "You can still keep the link and create the record first.",
        trackSelectLabel: "Subtitle track",
        trackSelectHint: "If the player exposes multiple subtitle tracks, you can switch which one to import here.",
        debugLabel: "Probe details",
        fetchStrategyLabel: "Fetch strategy",
        trackCountLabel: (count) => `${count} subtitle track(s) detected`,
        cookieUsed: "Bilibili cookie attached",
        cookieMissing: "Anonymous request"
      },
      linkImport: {
        title: "Link Assist Import",
        description: "Imported results, gaps, and warnings show up here.",
        idleHint: "Once you add a link, the import result, gaps, and notes will appear here.",
        trigger: "Try Importing Link Content",
        partialHelper: "Only part of the reusable text was imported. Please continue adding the source text below.",
        insufficientHelper: "Only the title or excerpt was imported. Please add the main body text below.",
        failedHelper:
          "The link could not be turned into reusable body text automatically, but you can still add it manually below and create the record."
      },
      browserImport: {
        trigger: "Browser import (Beta)",
        waitingTitle: "Browser import is waiting",
        waitingDescription: "Go to the current Bilibili video page and click the sideloaded extension. The page context will be sent back to the archiver.",
        syncing: "Browser import content was received and is being applied to the form.",
        ready: "Browser import is ready. Review the content and create the record.",
        incomplete: "Browser import finished, but the body text is still incomplete. Add subtitles or notes before AI if needed.",
        failed: "Browser import did not complete, but you can still create the record and fill in the content manually."
      },
      createRecord: "Create record",
      manageFolderCreate: "Create folder",
      manageFolderRename: "Rename folder",
      manageTagCreate: "Create tag",
      manageTagRename: "Rename tag",
      folderDescription: "Folders are the main archive layer. Each record belongs to one folder.",
      tagDescription: "Tags help you organize records across folders.",
      folderName: "Folder name",
      tagName: "Tag name",
      folderNamePlaceholder: "Enter a folder name",
      tagNamePlaceholder: "Enter a tag name",
      nameRequired: "Name is required",
      nameTooLong: "Keep the name within 40 characters"
    },
    mediaAsset: {
      storageMode: {
        none: "Not archived",
        local_archive_dir: "Local archive directory"
      },
      availability: {
        ready: "Media available",
        missing: "Media missing",
        permission_required: "Authorization required",
        write_failed: "Archive failed",
        not_archived: "Original media not archived"
      },
      availabilityDescription: {
        ready: "The media has been archived and can support future review workflows.",
        missing: "The original media is missing, so playback is unavailable, but the text archive is still intact.",
        permission_required: "Re-authorize the archive directory before this media can be accessed.",
        write_failed: "Media archiving failed, so only the text archive is currently retained.",
        not_archived: "This record currently keeps text and metadata only, without the original media."
      }
    },
    confirm: {
      defaultTitle: "Confirm action",
      deleteFolderTitle: (name) => `Delete folder "${name}"`,
      deleteFolderDescription:
        "Records in this folder will be moved back to Uncategorized Records. This cannot be undone.",
      deleteTagTitle: (name) => `Delete tag "${name}"`,
      deleteTagDescription: "This tag will be removed from every record. This cannot be undone.",
      deleteRecordTitle: (name) => `Delete record "${name}"`,
      deleteRecordDescription: "This record and its AI results will be permanently removed from local storage.",
      deleteRecordConfirm: "Delete record",
      deleteConfirm: "Delete"
    },
    export: {
      folderExportTitle: (name) => `${name} export`,
      noAiResult: "No AI result yet",
      conciseTitle: "AI result (concise)",
      learningTitle: "AI result (learning)",
      originalContent: "Source content",
      personalNote: "Personal notes",
      platform: "Platform",
      folder: "Folder",
      tags: "Tags",
      originalUrl: "Original URL",
      createdAt: "Created",
      updatedAt: "Updated",
      watchedAt: "Watched at",
      summary: "Summary",
      bullets: "Key points",
      coreConclusion: "Core Conclusion",
      logicFramework: "Logic Framework",
      keyDetails: "Key Details",
      reusablePoints: "Reusable Points",
      emptyFolder: "This folder does not contain any records."
    },
    errors: {
      duplicateFolder: "A folder with the same name already exists.",
      duplicateTag: "A tag with the same name already exists.",
      rawTextRequired: "Source content is required before AI analysis.",
      textTooShort: (min) => `Source content is too short. Add at least ${min} characters.`,
      aiResponseInvalid: "The AI response format was invalid. Please try again.",
      aiRequestFailed: "The AI request failed. Check the service and try again.",
      unsupportedFileFormat: "Unsupported File Format",
      fileTooLarge: (sizeLimitMb) => `File Too Large. Upload a single file within ${sizeLimitMb}MB.`,
      transcriptionTimeout: "Processing timed out. Please retry.",
      transcriptionQuotaExceeded: "The current AI transcription quota has been exhausted. Please retry later or switch to an available configuration.",
      transcriptionFailed: "Transcription Failed",
      youCanContinueEditingManually: "You Can Continue Editing Manually",
      noTranscriptAvailable: "No Transcript Available",
      internalError: "Something went wrong during analysis. Please try again."
    },
    analysisStatus: {
      needsReview: "Analysis Needs Review"
    },
    status: {
      not_started: "Not started",
      processing: "Processing",
      done: "Ready",
      needs_review: "Needs Review",
      failed: "Failed"
    },
    transcriptionStatus: {
      idle: "Idle",
      file_uploaded: "File Uploaded",
      extracting_audio: "Extracting Audio",
      transcribing: "Transcribing",
      transcript_ready: "Transcript Ready",
      transcript_needs_review: "Needs Review",
      transcript_failed: "Transcript Failed"
    },
    platform: {
      tiktok: "TikTok",
      bilibili: "Bilibili",
      xiaohongshu: "Xiaohongshu",
      other: "Other",
      unknown: "Unknown"
    },
    sourceType: {
      video: "Video",
      audio: "Audio",
      text: "Text",
      link: "Link",
      manual: "Manual"
    },
    highlightTone: {
      core: "Core",
      method: "Method",
      action: "Action",
      warning: "Warning"
    }
  }
};

export function getMessages(language: AppLanguage) {
  return messages[language];
}

export function getPlatformLabel(platform: SourcePlatform, language: AppLanguage) {
  return messages[language].platform[platform];
}

export function getStatusLabel(status: AIStatus, language: AppLanguage) {
  return messages[language].status[status];
}

export function getSourceTypeLabel(sourceType: SourceType, language: AppLanguage) {
  return messages[language].sourceType[sourceType];
}

export function getTranscriptionStatusMessage(status: TranscriptionStatus, language: AppLanguage) {
  return messages[language].transcriptionStatus[status];
}

export function getFolderDisplayName(folder: Pick<Folder, "name" | "isSystem">, language: AppLanguage) {
  return folder.isSystem ? messages[language].common.systemFolder : folder.name;
}

export function getAnalyzeErrorMessage(
  code: AnalyzeErrorCode,
  language: AppLanguage,
  minLength = 20
) {
  const target = messages[language].errors;

  if (code === "RAW_TEXT_REQUIRED") {
    return target.rawTextRequired;
  }

  if (code === "TEXT_TOO_SHORT") {
    return target.textTooShort(minLength);
  }

  if (code === "AI_RESPONSE_INVALID") {
    return target.aiResponseInvalid;
  }

  if (code === "AI_REQUEST_FAILED") {
    return target.aiRequestFailed;
  }

  return target.internalError;
}

export function getAnalyzeReviewNotice(feedback: AnalyzeFeedback, language: AppLanguage) {
  const detail = messages[language].detail;

  const reason =
    feedback.review.reasonCode === "source_text_needs_review"
      ? detail.reviewReasonSourceTextNeedsReview
      : detail.reviewReasonSourceTextNeedsReview;

  const action =
    feedback.review.recommendedAction === "retry_analysis"
      ? detail.reviewActionRetryAnalyze
      : feedback.review.recommendedAction === "edit_source_text"
        ? detail.reviewActionEditSourceText
        : null;

  return {
    title: detail.reviewNoticeTitle,
    reason,
    action,
    sourceHint: feedback.source === "local" ? detail.reviewSourceLocal : null
  };
}

export function getBilibiliImportErrorMessage(code: BilibiliImportErrorCode, language: AppLanguage) {
  const target = messages[language].modals.bilibiliImport;

  if (code === "INVALID_BILIBILI_URL") {
    return target.invalidUrl;
  }

  if (code === "VIDEO_INFO_UNAVAILABLE") {
    return target.videoInfoUnavailable;
  }

  if (code === "SUBTITLE_LIST_UNAVAILABLE") {
    return target.subtitleListUnavailable;
  }

  if (code === "SUBTITLE_TRACK_UNAVAILABLE") {
    return target.subtitleTrackUnavailable;
  }

  if (code === "SUBTITLE_UNAVAILABLE") {
    return target.subtitleUnavailable;
  }

  return target.requestFailed;
}

export function getTranscriptionErrorMessage(
  code: TranscriptionErrorCode,
  language: AppLanguage,
  sizeLimitMb: number
) {
  const target = messages[language].errors;

  if (code === "UNSUPPORTED_FILE_FORMAT") {
    return target.unsupportedFileFormat;
  }

  if (code === "FILE_TOO_LARGE") {
    return target.fileTooLarge(sizeLimitMb);
  }

  if (code === "TRANSCRIPTION_TIMEOUT") {
    return target.transcriptionTimeout;
  }

  if (code === "TRANSCRIPTION_QUOTA_EXCEEDED") {
    return target.transcriptionQuotaExceeded;
  }

  if (code === "TRANSCRIPTION_FAILED" || code === "AUDIO_EXTRACTION_FAILED") {
    return target.transcriptionFailed;
  }

  if (code === "INVALID_UPLOAD") {
    return target.noTranscriptAvailable;
  }

  return target.internalError;
}

const importIssueMessages: Record<AppLanguage, Record<ImportIssueCode, string>> = {
  "zh-CN": {
    INVALID_URL: "链接格式无效，但你仍可继续创建记录并稍后补充内容。",
    UNSUPPORTED_PLATFORM: "当前链接暂不支持自动导入，可继续创建记录并手动补充正文。",
    NO_SUBTITLE_TRACK: "未检测到可导入字幕，可继续创建记录并手动补充正文。",
    SUBTITLE_FETCH_FAILED: "已识别到字幕线索，但当前未能完整提取正文，可继续创建记录并手动补充。",
    SUBTITLE_BODY_FETCH_FAILED: "已检测到字幕轨，但当前未能读取该轨正文，已回退到页面文本。",
    SUBTITLE_BODY_EMPTY: "已检测到字幕轨，但该轨未返回可用正文。",
    SUBTITLE_BODY_PARSE_FAILED: "字幕内容已返回，但当前未能正确解析整条正文。",
    SELECTED_TRACK_REFETCH_FAILED: "切换字幕轨后未能重新读取正文，已保留当前结果。",
    FALLBACK_TO_VISIBLE_TEXT: "当前已回退到页面可见文本，建议手动补充正文。",
    SUBTITLE_TRACK_UNAVAILABLE: "当前页面没有可访问的字幕轨或完整转写，可继续创建记录并手动补充正文。",
    SUBTITLE_TRACK_DETECTED_BUT_UNFETCHABLE: "已检测到字幕轨，但当前未能读取整条字幕内容，建议手动补充正文。",
    VISIBLE_CAPTION_ONLY: "当前仅拿到播放器里可见的一句字幕，尚不能视为完整正文。",
    TRANSCRIPT_NOT_FOUND: "当前页面未找到可导入的完整转写或字幕正文。",
    TRANSCRIPT_TOO_SHORT: "当前导入内容过短，可能只有单句字幕或零碎片段，建议继续补充。",
    SECURITY_BLOCKED: "该链接被安全策略阻止，系统不会直接请求此目标；你仍可保留链接并手动补充内容。",
    TOO_MANY_REDIRECTS: "该链接跳转次数过多，当前已停止导入；你仍可继续创建记录并手动补充。",
    UNSUPPORTED_CONTENT_TYPE: "该链接返回的不是可提取正文的网页内容，建议手动补充正文或笔记。",
    CONTENT_TOO_LARGE: "该页面内容过大，当前已停止自动提取；你仍可保留链接并手动补充。",
    EXTRACTION_EMPTY: "页面已获取，但未提取到可复用正文。",
    META_ONLY: "当前仅提取到标题或摘要，建议继续补充正文。",
    OCR_NOT_ATTEMPTED: "页面中可能还有图片承载的正文内容，但本次未尝试图片文字识别。",
    OCR_PROVIDER_UNAVAILABLE: "页面可能依赖图片承载正文，但当前服务端未配置图片 OCR 能力。",
    OCR_RATE_LIMITED: "图片文字识别已中断：当前请求过多，请稍后重试。",
    OCR_SERVICE_UNAVAILABLE: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。",
    OCR_BAD_REQUEST: "图片文字识别失败：当前图片格式或输入暂不被稳定支持。",
    OCR_UNKNOWN_ERROR: "图片文字识别失败：本次 OCR 处理出现异常，可稍后重试或手动补充原始内容。",
    OCR_NO_TEXT_DETECTED: "已尝试识别页面图片文字，但未提取到可复用内容。",
    MANUAL_COMPLETION_REQUIRED: "当前导入内容仍不足，建议继续补充正文 / 字幕 / 笔记。",
    COOKIE_REQUIRED_POSSIBLE:
      "当前未能完整提取内容，可能受平台访问限制影响；你仍可继续创建记录并手动补充。",
    MULTIPLE_TRACKS_NEED_SELECTION: "检测到多条字幕轨，可选择导入其中一条。",
    FETCH_FAILED: "远程页面抓取失败，但不会阻止你先创建记录。",
    NETWORK_ERROR: "远程导入流程发生网络问题，但不会阻止你先创建记录。",
    UNKNOWN_ERROR: "导入流程出现异常，但你仍可继续创建记录并手动补充内容。"
  },
  en: {
    INVALID_URL: "The link format looks invalid, but you can still create the record and add content later.",
    UNSUPPORTED_PLATFORM: "This link is not supported for automatic import yet. You can still create the record and add source text manually.",
    NO_SUBTITLE_TRACK: "No usable subtitle track was detected. You can still create the record and add source text manually.",
    SUBTITLE_FETCH_FAILED:
      "Subtitle information was detected, but the source text could not be fully imported. You can still create the record and complete it manually.",
    SUBTITLE_BODY_FETCH_FAILED:
      "A subtitle track was detected, but the selected track body could not be read. The import has fallen back to page text.",
    SUBTITLE_BODY_EMPTY: "A subtitle track was detected, but the selected track returned no usable body text.",
    SUBTITLE_BODY_PARSE_FAILED:
      "Subtitle content was returned, but the full body could not be parsed correctly.",
    SELECTED_TRACK_REFETCH_FAILED:
      "The selected subtitle track could not be reloaded, so the current result was kept.",
    FALLBACK_TO_VISIBLE_TEXT:
      "The import has fallen back to visible page text. Adding more source text manually is recommended.",
    SUBTITLE_TRACK_UNAVAILABLE:
      "No accessible subtitle track or full transcript was found on this page. You can still create the record and complete it manually.",
    SUBTITLE_TRACK_DETECTED_BUT_UNFETCHABLE:
      "Subtitle tracks were detected, but the full track content could not be read. Manual completion is recommended.",
    VISIBLE_CAPTION_ONLY:
      "Only the currently visible subtitle line was captured, which is not enough to count as full source text.",
    TRANSCRIPT_NOT_FOUND: "No complete transcript or subtitle body was found on the page.",
    TRANSCRIPT_TOO_SHORT:
      "The imported text is too short and may only be a single subtitle cue or fragment. Adding more source text is recommended.",
    SECURITY_BLOCKED:
      "This link was blocked by the import security policy. You can still keep the link and add the text manually.",
    TOO_MANY_REDIRECTS:
      "The link redirected too many times, so the import was stopped. You can still create the record and complete it manually.",
    UNSUPPORTED_CONTENT_TYPE:
      "The link did not return a readable web page for text extraction. Adding the source text manually is recommended.",
    CONTENT_TOO_LARGE:
      "The page was too large to import safely. You can still keep the link and complete the record manually.",
    EXTRACTION_EMPTY: "The page was fetched, but no reusable body text was extracted.",
    META_ONLY:
      "Only the title or summary could be imported from the page. Adding the main body text manually is recommended.",
    OCR_NOT_ATTEMPTED:
      "The page may still rely on image-based body text, but image OCR was not attempted for this import.",
    OCR_PROVIDER_UNAVAILABLE:
      "The page may rely on image-based body text, but image OCR is not configured on this server.",
    OCR_RATE_LIMITED:
      "Image text recognition was interrupted because requests are being rate limited. Please try again later.",
    OCR_SERVICE_UNAVAILABLE:
      "Image text recognition was interrupted because the model service is busy right now. Please try again later.",
    OCR_BAD_REQUEST:
      "Image text recognition failed because the current image input does not look stably supported.",
    OCR_UNKNOWN_ERROR:
      "Image text recognition failed because an unexpected OCR error occurred. Please try again later or add the source text manually.",
    OCR_NO_TEXT_DETECTED:
      "Image OCR was attempted for this page, but no reusable text was detected.",
    MANUAL_COMPLETION_REQUIRED:
      "The imported content is still insufficient. Please add subtitles, notes, or source text manually.",
    COOKIE_REQUIRED_POSSIBLE:
      "The content could not be fully imported and platform access restrictions may be involved. You can still create the record and complete it manually.",
    MULTIPLE_TRACKS_NEED_SELECTION: "Multiple subtitle tracks were detected. You can choose which one to import.",
    FETCH_FAILED: "Fetching the remote page failed, but you can still create the record.",
    NETWORK_ERROR: "The remote import flow hit a network problem, but you can still create the record.",
    UNKNOWN_ERROR: "Something went wrong during import, but you can still create the record and fill in the content manually."
  }
};

const importUiMessages = {
  "zh-CN": {
    detectingPlatform: "正在识别导入来源…",
    fetchingRemoteContent: "正在尝试获取可导入内容…",
    idleHint: "输入链接后，可在这里查看提取结果、缺口和提示。",
    complete: "已获取足够内容，创建后可直接进入整理。",
    partial: "已导入部分内容，建议先补充正文再整理。",
    needsUserInput: "已识别链接或来源，但正文仍不足。可继续创建，并在下方补充正文 / 字幕 / 笔记。",
    failedButCreatable: "自动导入流程未完成，但不会阻止你先创建记录。",
    htmlOnlyReady: "已提取网页正文，可继续整理。",
    htmlOnlyNoOcr: "已提取网页文本；检测到页面还包含可能有信息的图片，但本次未尝试 OCR，因此未提取图片中的文字。",
    htmlOnlyProviderUnavailable:
      "已提取网页文本；检测到页面还包含可能有信息的图片，但当前无法执行 OCR，因此未提取图片中的文字。",
    htmlAndOcr: "已提取网页文本，并补充识别了部分图片文字。",
    metaOnly: "仅提取到标题或摘要，请补充正文。",
    insufficient: "未提取到足够可整理内容，请在下方补充正文。",
    partialHelper: "当前只拿到部分可整理文本，建议在下方继续补充原始内容。",
    insufficientHelper: "当前只拿到标题或摘要，建议在下方补充正文。",
    failedHelper: "未能自动提取可用正文，但仍可在下方手动补充后继续创建记录。",
    ocrCoverageGapHint: (found: number, selected: number) =>
      `检测到 ${found} 张图片信号，当前仅分析前 ${selected} 张正文候选图；`,
    ocrGapPartialSuccessHint: "当前已分析图片中，已补回部分可用文字。",
    ocrGapAttemptedNoTextHint: "本轮 OCR 未从已纳入的图片中提取到可用于整理的文字。",
    ocrGapNotAttemptedHint: "检测到页面包含可能有信息的图片，本次未尝试 OCR，因此未提取图片中的文字。",
    ocrGapProviderUnavailableHint: "检测到页面包含可能有信息的图片，当前无法执行 OCR，因此未提取图片中的文字。",
    ocrNotAttemptedHint: (count: number) => `检测到 ${count} 张可能承载正文的图片，但图片中的文字本次未尝试识别。`,
    ocrProviderUnavailableHint: (count: number) => `检测到 ${count} 张可能承载正文的图片，但图片中的文字尚未识别（当前未配置 OCR 能力）。`,
    ocrNotAttemptedCappedHint: (found: number, selected: number) =>
      `检测到 ${found} 张图片信号，当前仅选取前 ${selected} 张作为正文候选图，但图片中的文字本次未尝试识别。`,
    ocrProviderUnavailableCappedHint: (found: number, selected: number) =>
      `检测到 ${found} 张图片信号，当前仅选取前 ${selected} 张作为正文候选图，但图片中的文字尚未识别（当前未配置 OCR 能力）。`,
    ocrNotAttemptedFilteredHint: (found: number, selected: number) =>
      `检测到 ${found} 张图片信号，但当前仅有 ${selected} 张符合正文候选条件，本次未尝试识别。`,
    ocrProviderUnavailableFilteredHint: (found: number, selected: number) =>
      `检测到 ${found} 张图片信号，但当前仅有 ${selected} 张符合正文候选条件，且当前服务端未配置 OCR 能力。`,
    ocrPartialSignalsHint: (found: number, selected: number) =>
      `页面里检测到 ${found} 张图片信号，当前仅基于其中 ${selected} 张正文候选图判断覆盖度。`,
    ocrSuccessfulHint: (succeeded: number, detected: number) => `已识别 ${succeeded}/${detected} 张正文图片中的文字。`,
    ocrNoTextHint: (attempted: number) => `已尝试识别 ${attempted} 张图片，但当前仍未拿到可用于整理的文字。`,
    multipleTracksAvailable: "已检测到多条字幕轨，可继续使用当前结果，也可切换其他轨道。",
    selectTrackRecommended: "当前检测到多条字幕轨，建议先选择一条再创建记录。",
    selectTrackPlaceholder: "请选择字幕轨",
    warningsTitle: "导入提示",
    debugTitle: "调试信息",
    fetchStrategyLabel: "探测策略",
    trackCountLabel: (count: number) => `已检测到 ${count} 条字幕轨`,
    cookieUsed: "已携带 B 站 cookie",
    cookieMissing: "当前为匿名请求"
  },
  en: {
    detectingPlatform: "Detecting the import source…",
    fetchingRemoteContent: "Trying to fetch importable content…",
    idleHint: "Once you add a link, the import result, gaps, and notes will appear here.",
    complete: "Enough content was imported. You can create the record and go straight to AI organization.",
    partial: "Part of the content was imported. It is best to add more source text before organizing it.",
    needsUserInput:
      "The source or link was recognized, but the body text is still insufficient. You can create the record and add subtitles, notes, or source text in the editor below.",
    failedButCreatable: "The automatic import flow did not complete, but you can still create the record.",
    htmlOnlyReady: "Web page text was extracted and is ready to organize.",
    htmlOnlyNoOcr:
      "Web page text was extracted. The page also appears to contain images with useful information, but OCR was not attempted for this import, so no text was recovered from them.",
    htmlOnlyProviderUnavailable:
      "Web page text was extracted. The page also appears to contain images with useful information, but OCR is not available right now, so no text was recovered from them.",
    htmlAndOcr: "Web page text was extracted and some image text was added through OCR.",
    metaOnly: "Only the title or excerpt was extracted. Please add the main body text.",
    insufficient: "Not enough reusable text was extracted. Please add the body text in the editor below.",
    partialHelper: "Only part of the reusable text was imported. Please continue adding the source text below.",
    insufficientHelper: "Only the title or excerpt was imported. Please add the main body text below.",
    failedHelper:
      "The link could not be turned into reusable body text automatically, but you can still add it manually below and create the record.",
    ocrCoverageGapHint: (found: number, selected: number) =>
      `Detected ${found} image signals, and only the first ${selected} body-image candidates were analyzed;`,
    ocrGapPartialSuccessHint: "Some usable text was recovered from the analyzed images.",
    ocrGapAttemptedNoTextHint:
      "This OCR pass did not recover text ready for organization from the included images.",
    ocrGapNotAttemptedHint:
      "The page appears to contain images with useful information, but OCR was not attempted for this import.",
    ocrGapProviderUnavailableHint:
      "The page appears to contain images with useful information, but OCR is not available right now.",
    ocrNotAttemptedHint: (count: number) =>
      `${count} image(s) may carry body text, but OCR was not attempted for this import.`,
    ocrProviderUnavailableHint: (count: number) =>
      `${count} image(s) may carry body text, but OCR is not configured on this server.`,
    ocrNotAttemptedCappedHint: (found: number, selected: number) =>
      `${found} image signals were detected, and only the first ${selected} are currently selected as body-image candidates, but OCR was not attempted.`,
    ocrProviderUnavailableCappedHint: (found: number, selected: number) =>
      `${found} image signals were detected, and only the first ${selected} are currently selected as body-image candidates, and OCR is not configured on this server.`,
    ocrNotAttemptedFilteredHint: (found: number, selected: number) =>
      `${found} image signals were detected, but only ${selected} currently match the body-image filter, and OCR was not attempted.`,
    ocrProviderUnavailableFilteredHint: (found: number, selected: number) =>
      `${found} image signals were detected, but only ${selected} currently match the body-image filter, and OCR is not configured on this server.`,
    ocrPartialSignalsHint: (found: number, selected: number) =>
      `${found} image signals were detected on the page, and the current coverage estimate only uses ${selected} body-image candidates.`,
    ocrSuccessfulHint: (succeeded: number, detected: number) =>
      `OCR recognized text from ${succeeded}/${detected} body image(s).`,
    ocrNoTextHint: (attempted: number) =>
      `OCR checked ${attempted} image(s), but no text ready for organization was recovered yet.`,
    multipleTracksAvailable: "Multiple subtitle tracks were found. You can keep the current result or switch to another track.",
    selectTrackRecommended: "Multiple subtitle tracks were found. Choosing one before creating is recommended.",
    selectTrackPlaceholder: "Choose a subtitle track",
    warningsTitle: "Import notes",
    debugTitle: "Debug details",
    fetchStrategyLabel: "Fetch strategy",
    trackCountLabel: (count: number) => `${count} subtitle track(s) detected`,
    cookieUsed: "Bilibili cookie attached",
    cookieMissing: "Anonymous request"
  }
} satisfies Record<
  AppLanguage,
  {
    idleHint: string;
    detectingPlatform: string;
    fetchingRemoteContent: string;
    complete: string;
    partial: string;
    needsUserInput: string;
    failedButCreatable: string;
    htmlOnlyReady: string;
    htmlOnlyNoOcr: string;
    htmlOnlyProviderUnavailable: string;
    htmlAndOcr: string;
    metaOnly: string;
    insufficient: string;
    partialHelper: string;
    insufficientHelper: string;
    failedHelper: string;
    ocrNotAttemptedHint: (count: number) => string;
    ocrProviderUnavailableHint: (count: number) => string;
    ocrNotAttemptedCappedHint: (found: number, selected: number) => string;
    ocrProviderUnavailableCappedHint: (found: number, selected: number) => string;
    ocrNotAttemptedFilteredHint: (found: number, selected: number) => string;
    ocrProviderUnavailableFilteredHint: (found: number, selected: number) => string;
    ocrCoverageGapHint: (found: number, selected: number) => string;
    ocrGapPartialSuccessHint: string;
    ocrGapAttemptedNoTextHint: string;
    ocrGapNotAttemptedHint: string;
    ocrGapProviderUnavailableHint: string;
    ocrPartialSignalsHint: (found: number, selected: number) => string;
    ocrSuccessfulHint: (succeeded: number, detected: number) => string;
    ocrNoTextHint: (attempted: number) => string;
    multipleTracksAvailable: string;
    selectTrackRecommended: string;
    selectTrackPlaceholder: string;
    warningsTitle: string;
    debugTitle: string;
    fetchStrategyLabel: string;
    trackCountLabel: (count: number) => string;
    cookieUsed: string;
    cookieMissing: string;
  }
>;

export function getImportIssueMessage(code: ImportIssueCode, language: AppLanguage) {
  return importIssueMessages[language][code];
}

export function getImportUiMessages(language: AppLanguage) {
  return importUiMessages[language];
}
