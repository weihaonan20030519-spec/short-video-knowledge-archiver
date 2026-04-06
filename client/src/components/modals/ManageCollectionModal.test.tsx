import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { ManageCollectionModal } from "./ManageCollectionModal";
import { render } from "@testing-library/react";

describe("ManageCollectionModal", () => {
  it("shows inline validation for blank names", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);

    render(
      <ManageCollectionModal
        open
        entityLabel="folder"
        mode="create"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.clear(screen.getByPlaceholderText("输入文件夹名称"));
    await user.type(screen.getByPlaceholderText("输入文件夹名称"), " ");
    await user.click(screen.getByRole("button", { name: "新建" }));

    expect(await screen.findByText("名称不能为空")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows submit error returned by the parent handler", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue("已存在同名标签，请换一个名称。");

    render(
      <ManageCollectionModal
        open
        entityLabel="tag"
        mode="create"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByPlaceholderText("输入标签名称"), "复盘");
    await user.click(screen.getByRole("button", { name: "新建" }));

    expect(await screen.findByText("已存在同名标签，请换一个名称。")).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith("复盘");
  });
});
