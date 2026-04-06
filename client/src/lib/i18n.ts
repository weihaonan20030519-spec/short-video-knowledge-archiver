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
    };
    systemSection: string;
    systemFolderDescription: string;
    recordCount: (count: number) => string;
    folders: string;
    tags: string;
    create: string;
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
    needsReviewTitle: string;
    needsReviewDescription: string;
    allTitle: string;
    allDescription: string;
  };
  detail: {
    basicInfo: string;
    classification: string;
    sourcePlatform: string;
    sourceType: string;
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
    startAnalyze: string;
    retryAnalyze: string;
    analyzingMode: (modeLabel: string) => string;
    analyzingDescription: (modeLabel: string) => string;
    keepPreviousResult: string;
    latestAnalyzeFailed: string;
    updatedJustNow: string;
    viewOriginal: string;
    generatedAt: string;
    noAiResult: string;
    noAiResultDescription: string;
    personalNote: string;
    personalNotePlaceholder: string;
    actions: string;
    exportPdf: string;
    deleteRecord: string;
    title: string;
    transcriptMetadata: string;
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
      core: string;
      method: string;
      action: string;
      warning: string;
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
    uploadTitle: string;
    uploadDescription: string;
    uploadInputLabel: string;
    uploadHint: (sizeLimitMb: number, minutes: number) => string;
    uploadStatusCardTitle: string;
    uploadCurrentStatus: string;
    uploadCurrentStep: string;
    uploadSteps: string;
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
    contentPlaceholder: string;
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
  status: Record<AIStatus, string>;
  transcriptionStatus: Record<TranscriptionStatus, string>;
  platform: Record<SourcePlatform, string>;
  sourceType: Record<SourceType, string>;
  highlightTone: Record<HighlightTone, string>;
};

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
        unorganized: "未整理",
        needsReview: "待修正文稿"
      },
      systemSection: "系统入口",
      systemFolderDescription: "尚未归档到任何文件夹的内容会显示在这里",
      recordCount: (count) => `${count} 条记录`,
      folders: "文件夹",
      tags: "标签",
      create: "新建",
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
      unorganizedTitle: "未整理池为空",
      unorganizedDescription: "目前没有未整理或整理失败的记录。",
      needsReviewTitle: "暂无待修正文稿",
      needsReviewDescription: "已转写但仍待校对的记录会显示在这里。",
      allTitle: "暂无记录",
      allDescription: "先从左上角新建一条记录开始。"
    },
    detail: {
      basicInfo: "基础信息",
      classification: "分类",
      sourcePlatform: "来源平台",
      sourceType: "来源类型",
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
      startAnalyze: "开始整理",
      retryAnalyze: "重新整理",
      analyzingMode: (modeLabel) => `正在整理${modeLabel}…`,
      analyzingDescription: (modeLabel) => `正在生成${modeLabel}结果，请稍候。`,
      keepPreviousResult: "本次整理完成前，当前结果会继续保留。",
      latestAnalyzeFailed: "本次整理失败，当前结果已保留。",
      updatedJustNow: "刚刚更新",
      viewOriginal: "查看 AI 原始版",
      generatedAt: "生成时间",
      noAiResult: "还没有该模式的整理结果。",
      noAiResultDescription: "点击“开始整理”生成内容。",
      personalNote: "个人备注",
      personalNotePlaceholder: "记录你自己的观察、行动项或后续想法。",
      actions: "操作",
      exportPdf: "导出 PDF",
      deleteRecord: "删除记录",
      title: "标题",
      transcriptMetadata: "转写元信息",
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
      previewHint: "AI 结果已按分点卡片展示，重点会自动标亮。",
      legend: {
        core: "核心结论",
        method: "方法步骤",
        action: "可执行点",
        warning: "提醒风险"
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
        text: "粘贴文本",
        manual: "手动新建"
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
      contentPlaceholder: "AI 只能基于这里的文本整理。链接模式下也建议补充正文、字幕或笔记。",
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
    status: {
      not_started: "未整理",
      processing: "整理中",
      done: "已整理",
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
        unorganized: "Unorganized",
        needsReview: "Needs Review"
      },
      systemSection: "System",
      systemFolderDescription: "Content that has not been archived into any folder appears here.",
      recordCount: (count) => `${count} records`,
      folders: "Folders",
      tags: "Tags",
      create: "New",
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
      unorganizedTitle: "No pending records",
      unorganizedDescription: "There are no unprocessed or failed records right now.",
      needsReviewTitle: "No transcripts need review",
      needsReviewDescription: "Transcribed records that still need review will appear here.",
      allTitle: "No records yet",
      allDescription: "Start by creating a record from the top-left corner."
    },
    detail: {
      basicInfo: "Basic info",
      classification: "Classification",
      sourcePlatform: "Source platform",
      sourceType: "Source type",
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
      startAnalyze: "Analyze",
      retryAnalyze: "Analyze again",
      analyzingMode: (modeLabel) => `Generating ${modeLabel}…`,
      analyzingDescription: (modeLabel) => `Generating the ${modeLabel} result. This panel will update when the new version is ready.`,
      keepPreviousResult: "The previous result stays visible while this request runs.",
      latestAnalyzeFailed: "The latest analysis failed. Your previous result is still available.",
      updatedJustNow: "Updated just now",
      viewOriginal: "Show original AI result",
      generatedAt: "Generated",
      noAiResult: "No result for this mode yet.",
      noAiResultDescription: "Run AI to generate a structured summary.",
      personalNote: "Personal notes",
      personalNotePlaceholder: "Capture your observations, next steps, or follow-up ideas.",
      actions: "Actions",
      exportPdf: "Export PDF",
      deleteRecord: "Delete record",
      title: "Title",
      transcriptMetadata: "Transcript Metadata",
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
      previewHint: "AI results are shown as reading cards with automatic emphasis.",
      legend: {
        core: "Core insight",
        method: "Method or steps",
        action: "Actionable point",
        warning: "Risk or caution"
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
        text: "Paste text",
        manual: "Manual entry"
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
      contentPlaceholder: "AI only uses the text here. Even in link mode, it helps to paste notes, subtitles, or source text.",
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
    status: {
      not_started: "Not started",
      processing: "Processing",
      done: "Ready",
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
    MANUAL_COMPLETION_REQUIRED: "当前导入内容仍不足，建议继续补充正文 / 字幕 / 笔记。",
    COOKIE_REQUIRED_POSSIBLE:
      "当前未能完整提取内容，可能受平台访问限制影响；你仍可继续创建记录并手动补充。",
    MULTIPLE_TRACKS_NEED_SELECTION: "检测到多条字幕轨，可选择导入其中一条。",
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
    MANUAL_COMPLETION_REQUIRED:
      "The imported content is still insufficient. Please add subtitles, notes, or source text manually.",
    COOKIE_REQUIRED_POSSIBLE:
      "The content could not be fully imported and platform access restrictions may be involved. You can still create the record and complete it manually.",
    MULTIPLE_TRACKS_NEED_SELECTION: "Multiple subtitle tracks were detected. You can choose which one to import.",
    NETWORK_ERROR: "The remote import flow hit a network problem, but you can still create the record.",
    UNKNOWN_ERROR: "Something went wrong during import, but you can still create the record and fill in the content manually."
  }
};

const importUiMessages = {
  "zh-CN": {
    detectingPlatform: "正在识别导入来源…",
    fetchingRemoteContent: "正在尝试获取可导入内容…",
    complete: "已获取足够内容，创建后可直接进入整理。",
    partial: "已导入部分内容，建议创建后补充正文再整理。",
    needsUserInput: "已识别链接或来源，但正文仍不足。可继续创建，并补充正文 / 字幕 / 笔记。",
    failedButCreatable: "自动导入流程未完成，但不会阻止你先创建记录。",
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
    complete: "Enough content was imported. You can create the record and go straight to AI organization.",
    partial: "Part of the content was imported. It is best to add more source text after creating the record.",
    needsUserInput:
      "The source or link was recognized, but the body text is still insufficient. You can create the record and add subtitles, notes, or source text manually.",
    failedButCreatable: "The automatic import flow did not complete, but you can still create the record.",
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
    detectingPlatform: string;
    fetchingRemoteContent: string;
    complete: string;
    partial: string;
    needsUserInput: string;
    failedButCreatable: string;
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
