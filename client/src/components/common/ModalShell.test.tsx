import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModalShell } from "./ModalShell";

describe("ModalShell", () => {
  it("keeps the shared dialog shell free of the heavier backdrop blur and uses a lighter panel shadow", () => {
    const { container } = render(
      <ModalShell open title="删除确认" description="确认是否删除这条记录" onClose={() => undefined}>
        <div>内容</div>
      </ModalShell>
    );

    const overlay = container.firstElementChild as HTMLDivElement;
    const panel = overlay.firstElementChild as HTMLDivElement;

    expect(screen.getByText("删除确认")).toBeInTheDocument();
    expect(overlay).not.toHaveClass("backdrop-blur-sm");
    expect(panel).toHaveClass("shadow-[0_14px_30px_rgba(15,23,42,0.08)]");
  });

  it("can hide the header close button for confirm-style dialogs", () => {
    const { queryByRole } = render(
      <ModalShell open title="删除确认" description="确认是否删除这条记录" onClose={() => undefined} showCloseButton={false}>
        <div>内容</div>
      </ModalShell>
    );

    expect(queryByRole("button", { name: "关闭" })).not.toBeInTheDocument();
  });
});
