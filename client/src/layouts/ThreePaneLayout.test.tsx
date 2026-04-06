import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThreePaneLayout, WORKSPACE_LAYOUT_STORAGE_KEY } from "./ThreePaneLayout";

describe("ThreePaneLayout", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1600
    });
    window.localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY);
  });

  it("renders desktop panes as independent scroll containers inside a viewport-bounded shell", () => {
    render(
      <ThreePaneLayout
        sidebar={<aside className="h-full overflow-y-auto">sidebar</aside>}
        list={<section className="h-full overflow-y-auto">list</section>}
        detail={<section className="h-full overflow-y-auto">detail</section>}
      />
    );

    expect(screen.getByTestId("workspace-shell")).toHaveClass("h-dvh");
    expect(screen.getByTestId("workspace-shell")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("workspace-grid")).toHaveClass("h-full");
    expect(screen.getByTestId("workspace-grid")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("workspace-grid")).toHaveClass("xl:overflow-hidden");
    expect(screen.getByTestId("workspace-pane-sidebar")).toHaveClass("xl:overflow-hidden");
    expect(screen.getByTestId("workspace-pane-list")).toHaveClass("xl:overflow-hidden");
    expect(screen.getByTestId("workspace-pane-detail")).toHaveClass("xl:overflow-hidden");
  });

  it("updates pane widths on drag and persists the desktop layout", () => {
    render(
      <ThreePaneLayout
        sidebar={<aside>sidebar</aside>}
        list={<section>list</section>}
        detail={<section>detail</section>}
      />
    );

    const grid = screen.getByTestId("workspace-grid");
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({
      width: 1500,
      height: 900,
      top: 0,
      left: 0,
      right: 1500,
      bottom: 900,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect);

    const initialColumns = grid.getAttribute("style");

    fireEvent.mouseDown(screen.getByTestId("resize-handle-sidebar"), { clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 380 });
    fireEvent.mouseUp(window);

    expect(grid.getAttribute("style")).not.toBe(initialColumns);
    expect(window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY)).toContain("\"sidebar\":380");
  });

  it("enforces minimum pane widths while dragging", () => {
    render(
      <ThreePaneLayout
        sidebar={<aside>sidebar</aside>}
        list={<section>list</section>}
        detail={<section>detail</section>}
      />
    );

    const grid = screen.getByTestId("workspace-grid");
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({
      width: 1400,
      height: 900,
      top: 0,
      left: 0,
      right: 1400,
      bottom: 900,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect);

    fireEvent.mouseDown(screen.getByTestId("resize-handle-list"), { clientX: 420 });
    fireEvent.mouseMove(window, { clientX: 20 });
    fireEvent.mouseUp(window);

    expect(window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY)).toContain("\"list\":340");
  });
});
