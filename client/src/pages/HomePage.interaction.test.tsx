import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { recordRepository } from "../db/repositories/recordRepository";
import { APP_LANGUAGE_STORAGE_KEY } from "../lib/i18n";
import { useSettingsStore } from "../stores/settingsStore";
import { renderApp } from "../test/utils";
import { createFolder, createRecord, createTag } from "../test/factories";

async function openFolderCreateModal() {
  const { user } = await renderApp();
  const folderNewButtons = screen.getAllByRole("button", { name: "新建" });
  await user.click(folderNewButtons[0]);
  await screen.findByRole("heading", { name: "新建文件夹" });
  return { user };
}

async function openTagCreateModal() {
  const { user } = await renderApp();
  const newButtons = screen.getAllByRole("button", { name: "新建" });
  await user.click(newButtons[1]);
  await screen.findByRole("heading", { name: "新建标签" });
  return { user };
}

function getModalSubmitButton(placeholder: string) {
  return within(screen.getByPlaceholderText(placeholder).closest("form") as HTMLElement).getByRole("button", {
    name: "新建"
  });
}

async function openLinkImportCreateModal(user: Awaited<ReturnType<typeof renderApp>>["user"]) {
  await user.click(screen.getByRole("button", { name: "新建记录" }));
  await screen.findByRole("heading", { name: "录入新的内容线索" });
  await user.click(screen.getByRole("button", { name: "粘贴链接" }));
  await screen.findByPlaceholderText("https://...");
}

function createBilibiliImportData(overrides: Partial<{
  title: string | null;
  normalizedTranscriptText: string;
  selectedTrackId: string | null;
  usedCookie: boolean;
  fetchStrategy: string | null;
  notes: string[];
}> = {}) {
  return {
    title: overrides.title ?? "B站方法论视频",
    bvid: "BV1XX411C7MD",
    originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
    subtitleTracks: [
      {
        id: "track-manual",
        label: "中文",
        language: "zh-CN",
        isAiSubtitle: false,
        subtitleUrl: "https://example.com/manual.json"
      },
      {
        id: "track-ai",
        label: "中文（自动）",
        language: "zh-CN",
        isAiSubtitle: true,
        subtitleUrl: "https://example.com/ai.json"
      }
    ],
    selectedTrackId: overrides.selectedTrackId ?? "track-manual",
    rawTranscriptText: "先明确目标\n再拆步骤。",
    normalizedTranscriptText:
      overrides.normalizedTranscriptText ??
      "先明确目标，再拆步骤，并补充每一步的判断条件、执行细节和注意事项。\n\n这样导入后的正文会更完整，也更适合直接进入 AI 整理。",
    sourceMeta: {
      cid: "12345",
      usedCookie: overrides.usedCookie ?? false,
      fetchStrategy: overrides.fetchStrategy ?? "player-v2",
      playerStrategiesTried: ["player-wbi", "player-v2", "page-playinfo"],
      subtitleLanguage: "zh-CN"
    },
    debug: {
      selectedTrackReason: overrides.selectedTrackId ? "preferred-track" : "auto-priority",
      availableTrackCount: 2,
      failureStage: null,
      notes: overrides.notes ?? ["Anonymous request mode: some subtitle tracks may require a valid Bilibili cookie."]
    }
  };
}

describe("HomePage interactions", () => {
  it("auto-imports bilibili subtitles into the create-record modal", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: createBilibiliImportData(),
        error: null
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const { user } = await renderApp();

    await openLinkImportCreateModal(user);
    await user.type(screen.getByPlaceholderText("https://..."), "https://www.bilibili.com/video/BV1xx411c7mD/");

    expect(await screen.findAllByText("已检测到多条字幕轨，可继续使用当前结果，也可切换其他轨道。")).toHaveLength(2);
    expect(screen.getByDisplayValue("B站方法论视频")).toBeInTheDocument();
    const contentField = screen.getByRole("textbox", { name: "原始内容 / 字幕 / 备注" }) as HTMLTextAreaElement;
    expect(contentField.value).toContain("先明确目标");
    expect(contentField.value).toContain("更适合直接进入 AI 整理");
    expect(screen.getByText("已检测到 2 条字幕轨")).toBeInTheDocument();
    expect(screen.getByText("检测到多条字幕轨，可选择导入其中一条。")).toBeInTheDocument();
  });

  it("allows choosing another bilibili subtitle track when multiple tracks are detected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: createBilibiliImportData(),
          error: null
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: createBilibiliImportData({
            selectedTrackId: "track-ai",
            normalizedTranscriptText:
              "AI字幕第一句会先概括问题背景，随后补充执行路径、注意事项和适用条件。\n\nAI字幕第二句继续补足案例说明，确保导入文本足够完整。"
          }),
          error: null
        })
      });

    vi.stubGlobal("fetch", fetchMock);

    const { user } = await renderApp();

    await openLinkImportCreateModal(user);
    await user.type(screen.getByPlaceholderText("https://..."), "https://www.bilibili.com/video/BV1xx411c7mD/");

    const trackSelect = await screen.findByLabelText("字幕轨道", {}, { timeout: 2500 });
    await user.selectOptions(trackSelect, "track-ai");

    await waitFor(() => {
      const contentField = screen.getByRole("textbox", { name: "原始内容 / 字幕 / 备注" }) as HTMLTextAreaElement;
      expect(contentField.value).toContain("AI字幕第一句");
      expect(contentField.value).toContain("AI字幕第二句");
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/api/import/bilibili",
      expect.objectContaining({
        body: JSON.stringify({
          url: "https://www.bilibili.com/video/BV1xx411c7mD/",
          preferredTrackId: "track-ai"
        })
      })
    );

    await user.click(screen.getByRole("button", { name: "创建记录" }));

    expect(await screen.findByText("B站方法论视频")).toBeInTheDocument();
    const createdRecords = await recordRepository.listAll();
    expect(createdRecords[0]?.importSummary).toEqual({
      outcome: "partial",
      contentCompleteness: "partial"
    });
  });

  it("keeps record creation available when bilibili subtitle import fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: false,
        data: createBilibiliImportData({
          title: "B站无可用字幕视频",
          normalizedTranscriptText: "",
          selectedTrackId: null,
          notes: [
            "Anonymous request mode: some subtitle tracks may require a valid Bilibili cookie.",
            "player-wbi returned no subtitle tracks.",
            "player-v2 returned no subtitle tracks."
          ]
        }),
        error: {
          code: "SUBTITLE_TRACK_UNAVAILABLE",
          message: "subtitle unavailable"
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const { user } = await renderApp();

    await openLinkImportCreateModal(user);
    await user.type(screen.getByPlaceholderText("https://..."), "https://www.bilibili.com/video/BV1xx411c7mD/");

    expect(await screen.findAllByText("当前检测到多条字幕轨，建议先选择一条再创建记录。")).toHaveLength(2);
    expect(screen.getByText("已检测到 2 条字幕轨")).toBeInTheDocument();
    expect(
      screen.getByText("已识别到字幕线索，但当前未能完整提取正文，可继续创建记录并手动补充。")
    ).toBeInTheDocument();
    expect(
      screen.getByText("当前未能完整提取内容，可能受平台访问限制影响；你仍可继续创建记录并手动补充。")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "创建记录" }));

    expect(await screen.findByText("B站无可用字幕视频")).toBeInTheDocument();
    const createdRecords = await recordRepository.listAll();
    expect(createdRecords[0]?.importSummary).toEqual({
      outcome: "failed_but_creatable",
      contentCompleteness: "empty"
    });
  });

  it("distinguishes content insufficiency from process failure in the create modal", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          ...createBilibiliImportData({
            title: "只有标题的视频",
            normalizedTranscriptText: "",
            selectedTrackId: null,
            notes: []
          }),
          subtitleTracks: [],
          debug: {
            selectedTrackReason: "none",
            availableTrackCount: 0,
            failureStage: null,
            notes: []
          }
        },
        error: null
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const { user } = await renderApp();

    await openLinkImportCreateModal(user);
    await user.type(screen.getByPlaceholderText("https://..."), "https://www.bilibili.com/video/BV1xx411c7mD/");

    expect(
      await screen.findByText("已识别链接或来源，但正文仍不足。可继续创建，并补充正文 / 字幕 / 笔记。")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("自动导入流程未完成，但不会阻止你先创建记录。")
    ).not.toBeInTheDocument();
  });

  it("polls a browser import session and backfills the form when browser context data is ready", async () => {
    let pollCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/import/browser-context/session") && init?.method === "POST") {
        return {
          json: async () => ({
            success: true,
            data: {
              sessionToken: "browser-session-1",
              expiresAt: "2026-04-04T12:00:00.000Z"
            },
            error: null
          })
        };
      }

      if (url.endsWith("/api/import/browser-context/session/browser-session-1")) {
        pollCount += 1;
        return {
          json: async () => ({
            success: true,
            data:
              pollCount < 2
                ? {
                    sessionToken: "browser-session-1",
                    status: "pending",
                    expiresAt: "2026-04-04T12:00:00.000Z",
                    result: null
                  }
                : {
                    sessionToken: "browser-session-1",
                    status: "ready",
                    expiresAt: "2026-04-04T12:00:00.000Z",
                    result: {
                      source: "browser_context",
                      platform: "bilibili",
                      outcome: "complete",
                      originalUrl: "https://www.bilibili.com/video/BV1browserReady/",
                      detectedTitle: "浏览器上下文导入标题",
                      detectedContent:
                        "这是浏览器上下文里拿到的一段足够长的正文内容，会在 session ready 后自动回填到表单，并作为完整导入结果继续进入创建流程。这里继续补充说明、行动路径和限制条件。",
                      contentCompleteness: "full",
                      availableTracks: [
                        {
                          id: "track-browser",
                          label: "中文（自动）",
                          language: "zh-CN",
                          isAiSubtitle: true,
                          subtitleUrl: null
                        }
                      ],
                      selectedTrackId: "track-browser",
                      warningCodes: [],
                      canCreateRecord: true,
                      shouldPromptManualInput: false,
                      trackContentById: {
                        "track-browser":
                          "这是浏览器上下文里拿到的一段足够长的正文内容，会在 session ready 后自动回填到表单，并作为完整导入结果继续进入创建流程。这里继续补充说明、行动路径和限制条件。"
                      },
                      debugMeta: {
                        bvid: "BV1browserReady",
                        fetchStrategy: "browser-context",
                        usedCookie: true,
                        notes: ["read from browser tab"]
                      }
                    }
                  },
            error: null
          })
        };
      }

      throw new Error(`Unhandled fetch for ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "新建记录" }));
    await screen.findByRole("heading", { name: "录入新的内容线索" });
    await user.click(screen.getByRole("button", { name: "浏览器导入（Beta）" }));

    expect(await screen.findByText("请前往当前 B 站视频页并点击侧载扩展，扩展会把页面上下文提交回归档器。")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("浏览器上下文导入标题")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://www.bilibili.com/video/BV1browserReady/")).toBeInTheDocument();
    }, { timeout: 2500 });

    const contentField = screen.getByRole("textbox", { name: "原始内容 / 字幕 / 备注" }) as HTMLTextAreaElement;
    expect(contentField.value).toContain("浏览器上下文里拿到的一段足够长的正文内容");
    expect(screen.getByText("浏览器导入已就绪，可直接检查并创建记录。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "创建记录" }));

    const createdRecords = await recordRepository.listAll();
    expect(createdRecords[0]?.importSummary).toEqual({
      outcome: "complete",
      contentCompleteness: "full"
    });
  });

  it("switches browser-context tracks using page-world captured subtitle bodies", async () => {
    let pollCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/import/browser-context/session") && init?.method === "POST") {
        return {
          json: async () => ({
            success: true,
            data: {
              sessionToken: "browser-session-track",
              expiresAt: "2026-04-04T12:00:00.000Z"
            },
            error: null
          })
        };
      }

      if (url.endsWith("/api/import/browser-context/session/browser-session-track")) {
        pollCount += 1;
        return {
          json: async () => ({
            success: true,
            data:
              pollCount < 2
                ? {
                    sessionToken: "browser-session-track",
                    status: "pending",
                    expiresAt: "2026-04-04T12:00:00.000Z",
                    result: null
                  }
                : {
                    sessionToken: "browser-session-track",
                    status: "ready",
                    expiresAt: "2026-04-04T12:00:00.000Z",
                    result: {
                      source: "browser_context",
                      platform: "bilibili",
                      outcome: "partial",
                      originalUrl: "https://www.bilibili.com/video/BV1browserTrack/",
                      detectedTitle: "浏览器多轨导入",
                      detectedContent: "当前先拿到的是较短的第一条字幕内容。",
                      contentCompleteness: "partial",
                      availableTracks: [
                        {
                          id: "track-browser-1",
                          label: "中文",
                          language: "zh-CN",
                          isAiSubtitle: false,
                          subtitleUrl: "https://example.com/track-browser-1.json",
                          contentSource: "full_track",
                          cueCount: 1,
                          bodyLoadStatus: "loaded"
                        },
                        {
                          id: "track-browser-2",
                          label: "中文（自动）",
                          language: "zh-CN",
                          isAiSubtitle: true,
                          subtitleUrl: "https://example.com/track-browser-2.json",
                          contentSource: "full_track",
                          cueCount: 6,
                          bodyLoadStatus: "loaded"
                        }
                      ],
                      selectedTrackId: "track-browser-1",
                      warningCodes: ["MULTIPLE_TRACKS_NEED_SELECTION"],
                      canCreateRecord: true,
                      shouldPromptManualInput: true,
                      trackContentById: {
                        "track-browser-1": "当前先拿到的是较短的第一条字幕内容。",
                        "track-browser-2":
                          "切换轨道后重新读取到整条字幕正文，因此 detectedContent 会被新的整轨内容替换。这里继续补充执行路径、适用边界、风险条件和案例说明，确保它达到完整导入阈值。"
                      },
                      debugMeta: {
                        bvid: "BV1browserTrack",
                        fetchStrategy: "browser-context-page-world",
                        usedCookie: true,
                        notes: [
                          "page_world_started",
                          "page_world_track_discovered:track-browser-2:subtitleUrl=yes",
                          "page_world_body_fetch_success:track-browser-2:cueCount=6:length=108",
                          "extension_received_payload"
                        ]
                      }
                    }
                  },
            error: null
          })
        };
      }

      throw new Error(`Unhandled fetch for ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "新建记录" }));
    await screen.findByRole("heading", { name: "录入新的内容线索" });
    await user.click(screen.getByRole("button", { name: "浏览器导入（Beta）" }));

    const trackSelect = await screen.findByLabelText("字幕轨道", {}, { timeout: 2500 });
    await user.selectOptions(trackSelect, "track-browser-2");

    await waitFor(() => {
      const contentField = screen.getByRole("textbox", { name: "原始内容 / 字幕 / 备注" }) as HTMLTextAreaElement;
      expect(contentField.value).toContain("切换轨道后重新读取到整条字幕正文");
    });
  });

  it("keeps creation available when the browser import session expires", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/import/browser-context/session") && init?.method === "POST") {
        return {
          json: async () => ({
            success: true,
            data: {
              sessionToken: "browser-session-expired",
              expiresAt: "2026-04-04T12:00:00.000Z"
            },
            error: null
          })
        };
      }

      if (url.endsWith("/api/import/browser-context/session/browser-session-expired")) {
        return {
          json: async () => ({
            success: true,
            data: {
              sessionToken: "browser-session-expired",
              status: "expired",
              expiresAt: "2026-04-04T12:00:00.000Z",
              result: null
            },
            error: null
          })
        };
      }

      throw new Error(`Unhandled fetch for ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "新建记录" }));
    await screen.findByRole("heading", { name: "录入新的内容线索" });
    await user.click(screen.getByRole("button", { name: "浏览器导入（Beta）" }));

    expect(await screen.findByText("浏览器导入未完成，但你仍可继续创建记录并手动补录内容。")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "原始内容 / 字幕 / 备注" }), "先手动补一点内容。");
    await user.click(screen.getByRole("button", { name: "创建记录" }));

    const createdRecords = await recordRepository.listAll();
    expect(createdRecords[0]?.importSummary).toEqual({
      outcome: "failed_but_creatable",
      contentCompleteness: "empty"
    });
  });

  it("switches UI language to English and persists the preference", async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "EN" }));

    expect(await screen.findByRole("button", { name: "New record" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search titles, content, AI, notes, or tags")).toBeInTheDocument();
    expect(window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)).toBe("en");
  });

  it("promotes upload as the primary entry and localizes new upload labels in English", async () => {
    useSettingsStore.getState().setAppLanguage("en");
    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "New record" }));

    expect(await screen.findByRole("button", { name: "Upload File" })).toBeInTheDocument();
    expect(screen.getByText("Upload Video or Audio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paste text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual entry" })).toBeInTheDocument();
    expect(screen.getByText("Other import methods")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paste link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browser import (Beta)" })).toBeInTheDocument();
  });

  it("keeps AI analyze language bound to appLanguage instead of transcript language", async () => {
    useSettingsStore.getState().setAppLanguage("en");

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          summary: "English summary",
          bullets: ["Point one", "Point two", "Point three"]
        },
        error: null,
        meta: {
          generatedAt: "2026-04-05T12:00:00.000Z"
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const uploadedRecord = createRecord({
      id: "record-english-output",
      title: "Uploaded talk",
      originalContent: "This transcript is editable and already saved locally.",
      sourceType: "audio",
      transcriptionStatus: "transcript_needs_review",
      transcriptMeta: {
        fileName: "clip.mp3",
        mimeType: "audio/mpeg",
        size: 2048,
        language: "zh-CN"
      }
    });

    const { user } = await renderApp({ records: [uploadedRecord] });

    expect(await screen.findByText("Uploaded talk")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const analyzeCall = fetchMock.mock.calls.find(([url]) => url === "http://localhost:3001/api/analyze");
    expect(analyzeCall).toBeDefined();

    const requestInit = analyzeCall?.[1] as RequestInit | undefined;
    expect(requestInit?.method).toBe("POST");
    expect(JSON.parse(String(requestInit?.body))).toEqual(
      expect.objectContaining({
        appLanguage: "en",
        rawText: "This transcript is editable and already saved locally."
      })
    );

    await waitFor(async () => {
      const saved = await recordRepository.getById(uploadedRecord.id);
      expect(saved?.transcriptionStatus).toBe("transcript_ready");
    });
  });

  it("opens and closes the folder create modal", async () => {
    const { user } = await openFolderCreateModal();

    expect(screen.getByRole("heading", { name: "新建文件夹" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "新建文件夹" })).not.toBeInTheDocument();
    });
  });

  it("creates a folder and updates the sidebar list", async () => {
    const { user } = await openFolderCreateModal();

    await user.type(screen.getByPlaceholderText("输入文件夹名称"), "研究素材");
    await user.click(getModalSubmitButton("输入文件夹名称"));

    expect(await screen.findByRole("button", { name: "研究素材" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "新建文件夹" })).not.toBeInTheDocument();
  });

  it("prevents folder submit for blank and duplicate names", async () => {
    const existingFolder = createFolder({ id: "folder-existing", name: "研究素材", sortOrder: 1 });
    const { user } = await renderApp({ folders: [existingFolder] });

    const newButtons = screen.getAllByRole("button", { name: "新建" });
    await user.click(newButtons[0]);
    await screen.findByRole("heading", { name: "新建文件夹" });

    await user.clear(screen.getByPlaceholderText("输入文件夹名称"));
    await user.type(screen.getByPlaceholderText("输入文件夹名称"), "   ");
    await user.click(getModalSubmitButton("输入文件夹名称"));
    expect(await screen.findByText("名称不能为空")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("输入文件夹名称"));
    await user.type(screen.getByPlaceholderText("输入文件夹名称"), "研究素材");
    await user.click(getModalSubmitButton("输入文件夹名称"));
    expect(screen.getAllByRole("button", { name: "研究素材" })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "新建文件夹" })).toBeInTheDocument();
  });

  it("creates a tag and validates blank and duplicate tag names", async () => {
    const existingTag = createTag({ id: "tag-existing", name: "复盘" });
    const { user } = await renderApp({ tags: [existingTag] });

    const newButtons = screen.getAllByRole("button", { name: "新建" });
    await user.click(newButtons[1]);
    await screen.findByRole("heading", { name: "新建标签" });

    await user.clear(screen.getByPlaceholderText("输入标签名称"));
    await user.type(screen.getByPlaceholderText("输入标签名称"), " ");
    await user.click(getModalSubmitButton("输入标签名称"));
    expect(await screen.findByText("名称不能为空")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("输入标签名称"));
    await user.type(screen.getByPlaceholderText("输入标签名称"), "复盘");
    await user.click(getModalSubmitButton("输入标签名称"));
    await user.clear(screen.getByPlaceholderText("输入标签名称"));
    await user.type(screen.getByPlaceholderText("输入标签名称"), "方法论");
    await user.click(getModalSubmitButton("输入标签名称"));

    expect(await screen.findByRole("button", { name: "#方法论" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "#复盘" })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "新建标签" })).not.toBeInTheDocument();
  });

  it("opens delete confirmation and respects cancel vs confirm for folder deletion", async () => {
    const deletableFolder = createFolder({ id: "folder-delete", name: "待删除", sortOrder: 1 });
    const { user } = await renderApp({ folders: [deletableFolder] });

    const folderCard = (await screen.findByText("待删除")).closest("div");
    expect(folderCard).not.toBeNull();

    await user.click(within(folderCard as HTMLElement).getByRole("button", { name: "删除" }));
    expect(await screen.findByRole("heading", { name: "删除文件夹「待删除」" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "删除文件夹「待删除」" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("待删除")).toBeInTheDocument();

    await user.click(within(folderCard as HTMLElement).getByRole("button", { name: "删除" }));
    await user.click(await screen.findByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /待删除/ })).not.toBeInTheDocument();
    });
  });

  it("shows uncategorized records as a single system entry and filters unfiled records", async () => {
    const researchFolder = createFolder({ id: "folder-research", name: "研究素材", sortOrder: 1 });
    const uncategorizedRecord = createRecord({
      id: "record-uncategorized",
      title: "未归档记录",
      folderId: null
    });
    const archivedRecord = createRecord({
      id: "record-archived",
      title: "已归档记录",
      folderId: researchFolder.id
    });

    const { user } = await renderApp({
      folders: [researchFolder],
      records: [uncategorizedRecord, archivedRecord]
    });

    const systemEntry = screen.getByRole("button", { name: /未分类记录/ }).closest("div");
    expect(systemEntry).not.toBeNull();
    expect(within(systemEntry as HTMLElement).queryByRole("button", { name: "重命名" })).not.toBeInTheDocument();
    expect(within(systemEntry as HTMLElement).queryByRole("button", { name: "导出" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /未分类记录/ })).toHaveLength(1);

    await user.click(screen.getAllByRole("button", { name: /未分类记录/ })[0]);

    expect(await screen.findByText("未归档记录")).toBeInTheDocument();
    expect(screen.queryByText("已归档记录")).not.toBeInTheDocument();
    expect(screen.getByText("尚未归档到任何文件夹的内容会显示在这里")).toBeInTheDocument();
  });

  it("moves deleted folder records into uncategorized records", async () => {
    const deletableFolder = createFolder({ id: "folder-to-delete", name: "待删除文件夹", sortOrder: 1 });
    const movedRecord = createRecord({
      id: "record-moved",
      title: "删除后应回到未分类",
      folderId: deletableFolder.id
    });

    const { user } = await renderApp({
      folders: [deletableFolder],
      records: [movedRecord]
    });

    const folderCard = (await screen.findByText("待删除文件夹")).closest("div");
    expect(folderCard).not.toBeNull();
    await user.click(within(folderCard as HTMLElement).getByRole("button", { name: "删除" }));
    await user.click(await screen.findByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /待删除文件夹/ })).not.toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: /未分类记录/ })[0]);
    expect(await screen.findByText("删除后应回到未分类")).toBeInTheDocument();

    const savedRecord = await recordRepository.getById("record-moved");
    expect(savedRecord?.folderId).toBeNull();
  });

  it("keeps UI state synchronized after folder rename and selected record deletion", async () => {
    const workFolder = createFolder({ id: "folder-work", name: "工作流", sortOrder: 1 });
    const backupFolder = createFolder({ id: "folder-backup", name: "备份区", sortOrder: 2 });
    const firstRecord = createRecord({
      id: "record-first",
      title: "第一条记录",
      folderId: workFolder.id,
      createdAt: new Date("2026-04-02T10:00:00.000Z").toISOString()
    });
    const secondRecord = createRecord({
      id: "record-second",
      title: "第二条记录",
      folderId: backupFolder.id,
      createdAt: new Date("2026-04-02T09:00:00.000Z").toISOString()
    });

    const { user } = await renderApp({
      folders: [workFolder, backupFolder],
      records: [firstRecord, secondRecord]
    });

    expect(await screen.findByDisplayValue("第一条记录")).toBeInTheDocument();

    const workFolderCard = screen.getByRole("button", { name: "工作流" }).closest("div");
    expect(workFolderCard).not.toBeNull();
    await user.click(within(workFolderCard as HTMLElement).getByRole("button", { name: "重命名" }));

    expect(await screen.findByRole("heading", { name: "重命名文件夹" })).toBeInTheDocument();
    const folderNameInput = screen.getByPlaceholderText("输入文件夹名称");
    await user.clear(folderNameInput);
    await user.type(folderNameInput, "工作资料");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("button", { name: "工作资料" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "工作流" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除记录" }));
    expect(await screen.findByRole("heading", { name: "删除记录「第一条记录」" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认删除记录" }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("第一条记录")).not.toBeInTheDocument();
    });

    expect(await screen.findByDisplayValue("第二条记录")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "第一条记录" })).not.toBeInTheDocument();
    expect(screen.getByText("第二条记录")).toBeInTheDocument();
  });

  it("closes the two-pane detail overlay without auto-selecting the first record again", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900
    });

    const firstRecord = createRecord({ id: "record-1", title: "第一条记录" });
    const secondRecord = createRecord({ id: "record-2", title: "第二条记录", createdAt: new Date("2026-04-02T11:00:00.000Z").toISOString() });

    const { user } = await renderApp({
      records: [firstRecord, secondRecord]
    });

    expect(await screen.findByTestId("workspace-detail-overlay")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "关闭" }));

    await waitFor(() => {
      expect(screen.queryByTestId("workspace-detail-overlay")).not.toBeInTheDocument();
    });
  });
});
