import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmActionModal } from "./ConfirmActionModal";

describe("ConfirmActionModal", () => {
  it("keeps only cancel and confirm actions in the delete confirmation dialog", () => {
    render(
      <ConfirmActionModal
        open
        title="确认删除记录"
        description="删除后不可恢复。"
        confirmLabel="确认删除记录"
        danger
        onClose={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认删除记录" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "关闭" })).not.toBeInTheDocument();
  });
});
