import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "./Sidebar";
import { createFolder, createTag } from "../../test/factories";

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

    expect(screen.getByRole("button", { name: /未分类记录/ })).toBeInTheDocument();
    expect(screen.getByText("尚未归档到任何文件夹的内容会显示在这里")).toBeInTheDocument();
    expect(screen.getByText("3 条记录")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重命名" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "导出" })).not.toBeInTheDocument();
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
});
