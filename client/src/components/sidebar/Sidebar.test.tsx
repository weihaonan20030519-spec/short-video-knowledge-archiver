import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "./Sidebar";
import { createFolder, createTag } from "../../test/factories";

function mockResizeObserverWidth(width: number) {
  let currentWidth = width;
  let observedTarget: Element | null = null;
  let currentCallback: ResizeObserverCallback | null = null;

  class ResizeObserverMock {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      currentCallback = callback;
    }

    observe(target: Element) {
      observedTarget = target;
      this.callback(
        [
          {
            target,
            contentRect: { width: currentWidth } as DOMRectReadOnly
          } as ResizeObserverEntry
        ],
        this as unknown as ResizeObserver
      );
    }

    disconnect() {}

    unobserve() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);

  return {
    emit(nextWidth: number) {
      currentWidth = nextWidth;

      if (!currentCallback || !observedTarget) {
        return;
      }

      currentCallback(
        [
          {
            target: observedTarget,
            contentRect: { width: currentWidth } as DOMRectReadOnly
          } as ResizeObserverEntry
        ],
        {} as ResizeObserver
      );
    }
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Sidebar", () => {
  it("renders the create-record button with stronger emphasis classes", () => {
    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={0}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: "新建记录" });
    expect(button).toHaveClass("bg-gradient-to-b");
    expect(button).toHaveClass("shadow-[0_12px_28px_rgba(20,184,166,0.24)]");
    expect(button).toHaveClass("focus-visible:ring-teal-100");
    expect(button).toHaveClass("active:translate-y-px");
  });

  it("renders uncategorized records as a dedicated system entry without folder actions", () => {
    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={3}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    const systemEntry = screen.getByRole("button", { name: /未分类记录/ });
    const entryTitle = within(systemEntry).getByText("未分类记录");
    const entryDescription = within(systemEntry).getByText("尚未归档到任何文件夹的内容会显示在这里");
    const entryCount = within(systemEntry).getByText("3 条记录");

    expect(entryTitle).toHaveClass("min-w-0", "flex-1");
    expect(entryTitle).toHaveStyle("-webkit-line-clamp: 2");
    expect(entryDescription).toHaveStyle("-webkit-line-clamp: 2");
    expect(entryCount).toHaveClass(
      "inline-flex",
      "h-8",
      "shrink-0",
      "items-center",
      "justify-center",
      "rounded-full",
      "px-3",
      "text-xs",
      "font-medium",
      "leading-none",
      "whitespace-nowrap"
    );
    expect(screen.queryByRole("button", { name: "重命名" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "导出" })).not.toBeInTheDocument();
  });

  it("keeps the search input full width and truncation-ready in narrow layouts", () => {
    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={0}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText("搜索标题、内容、AI、备注、标签");
    expect(searchInput).toHaveClass("block", "w-full", "min-w-0", "overflow-hidden", "text-ellipsis", "whitespace-nowrap");
  });

  it("switches the language switcher into a compact utility toggle at the narrowest width", () => {
    mockResizeObserverWidth(180);

    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={0}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByTestId("sidebar-header-row")).toHaveClass("flex", "flex-col", "items-start", "gap-2");
    expect(screen.getByTestId("sidebar-language-switcher")).toHaveAttribute("data-layout", "compact");
    expect(screen.getByTestId("sidebar-language-switcher")).toHaveClass("self-start");
    expect(screen.queryByTestId("sidebar-language-switcher-label")).not.toBeInTheDocument();
    expect(screen.getByTestId("sidebar-language-switcher-controls")).toHaveClass(
      "flex",
      "items-center",
      "gap-0.5",
      "p-0.5"
    );
    expect(screen.getByTestId("sidebar-language-option-zh-CN")).toHaveClass(
      "min-w-[2.2rem]",
      "px-1.5",
      "py-1",
      "text-[11px]",
      "leading-none"
    );
    expect(screen.getByTestId("sidebar-language-option-en")).toHaveClass(
      "min-w-[2.2rem]",
      "px-1.5",
      "py-1",
      "text-[11px]",
      "leading-none"
    );
  });

  it("keeps the language switcher inline when there is enough width", () => {
    mockResizeObserverWidth(420);

    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={0}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByTestId("sidebar-language-switcher")).toHaveAttribute("data-layout", "inline");
    expect(screen.getByTestId("sidebar-header-row")).toHaveClass("flex", "flex-wrap", "items-start", "gap-3");
    expect(screen.getByTestId("sidebar-language-switcher-label")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-language-switcher-controls")).toHaveClass("flex", "items-center", "gap-1", "p-0.5");
  });

  it("keeps the header position rule reversible when width shrinks and expands again", async () => {
    const resizeObserver = mockResizeObserverWidth(420);

    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={0}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByTestId("sidebar-language-switcher")).toHaveAttribute("data-layout", "inline");
    expect(screen.getByTestId("sidebar-language-switcher")).toHaveClass("ml-auto");
    expect(screen.getByTestId("sidebar-language-switcher-label")).toBeInTheDocument();

    resizeObserver.emit(180);

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-language-switcher")).toHaveAttribute("data-layout", "compact");
    });
    expect(screen.getByTestId("sidebar-language-switcher")).toHaveClass("self-start");
    expect(screen.queryByTestId("sidebar-language-switcher-label")).not.toBeInTheDocument();

    resizeObserver.emit(420);

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-language-switcher")).toHaveAttribute("data-layout", "inline");
    });
    expect(screen.getByTestId("sidebar-language-switcher")).toHaveClass("ml-auto");
    expect(screen.getByTestId("sidebar-language-switcher-label")).toBeInTheDocument();
  });

  it("keeps the wide pending bucket collapsed by default while exposing the child filter only on demand", () => {
    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={0}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "待处理" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "整理待复核" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "需复查" })).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "展开子状态" });
    expect(toggle).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-status-bucket")).toHaveClass("rounded-2xl");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "收起子状态" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "未开始" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "整理待复核" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "待处理" }));
    expect(screen.getByRole("button", { name: "待处理" })).toHaveClass("bg-slate-100", "text-slate-950");
    expect(screen.queryByRole("button", { name: "未开始" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "整理待复核" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开子状态" })).toBeInTheDocument();
  });

  it("applies pointer cursor on folder item root immediately", () => {
    const folder = createFolder({ id: "folder-1", name: "研究素材" });

    render(
      <Sidebar
        folders={[folder]}
        uncategorizedCount={0}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByTestId("folder-item-folder-1")).toHaveClass("cursor-pointer");
  });

  it("applies pointer cursor on tag item root immediately", () => {
    const tag = createTag({ id: "tag-1", name: "方法" });

    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={0}
        tags={[tag]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByTestId("tag-item-tag-1")).toHaveClass("cursor-pointer");
  });

  it("renders lightweight empty states for folders and tags without keeping large placeholder panels", () => {
    render(
      <Sidebar
        folders={[]}
        uncategorizedCount={0}
        tags={[]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByTestId("sidebar-folders-empty")).toHaveTextContent("暂无文件夹");
    expect(screen.getByTestId("sidebar-folders-empty")).toHaveTextContent("新建后会显示在这里。");
    expect(screen.getByTestId("sidebar-tags-empty")).toHaveTextContent("暂无标签");
    expect(screen.queryByTestId("sidebar-folders-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-tags-list")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("sidebar-folders-section")).getByRole("button", { name: "新建" })).toBeInTheDocument();
    expect(within(screen.getByTestId("sidebar-tags-section")).getByRole("button", { name: "新建" })).toBeInTheDocument();
  });

  it("lets single folder/tag sections shrink to their actual content without extra list whitespace", () => {
    render(
      <Sidebar
        folders={[createFolder({ id: "folder-1", name: "研究素材" })]}
        uncategorizedCount={0}
        tags={[createTag({ id: "tag-1", name: "方法" })]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByTestId("sidebar-folders-list")).not.toHaveClass("space-y-2");
    expect(screen.getByTestId("sidebar-tags-list")).not.toHaveClass("space-y-2");
    expect(screen.queryByTestId("sidebar-folders-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-tags-empty")).not.toBeInTheDocument();
  });

  it("uses full list spacing only when folders or tags have multiple items", () => {
    render(
      <Sidebar
        folders={[
          createFolder({ id: "folder-1", name: "研究素材" }),
          createFolder({ id: "folder-2", name: "采访素材" })
        ]}
        uncategorizedCount={0}
        tags={[createTag({ id: "tag-1", name: "方法" }), createTag({ id: "tag-2", name: "案例" })]}
        onOpenCreate={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateTag={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameTag={vi.fn()}
        onDeleteTag={vi.fn()}
        onExportFolder={vi.fn()}
      />
    );

    expect(screen.getByTestId("sidebar-pane")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("sidebar-folders-list")).toHaveClass("space-y-2");
    expect(screen.getByTestId("sidebar-tags-list")).toHaveClass("space-y-2");
  });
});
