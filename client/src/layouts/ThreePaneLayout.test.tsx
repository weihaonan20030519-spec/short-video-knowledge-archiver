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
    expect(screen.getByTestId("workspace-grid")).toHaveAttribute("data-layout-mode", "three-pane");
    expect(screen.getByTestId("workspace-grid")).toHaveClass("h-full");
    expect(screen.getByTestId("workspace-grid")).toHaveClass("min-w-0");
    expect(screen.getByTestId("workspace-pane-sidebar")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("workspace-pane-sidebar")).toHaveClass("min-w-0");
    expect(screen.getByTestId("workspace-pane-list")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("workspace-pane-list")).toHaveClass("min-w-0");
    expect(screen.getByTestId("workspace-pane-detail")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("workspace-pane-detail")).toHaveClass("min-w-0");
  });

  it("keeps the desktop three-pane grid at ordinary desktop widths", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1180
    });

    render(
      <ThreePaneLayout
        sidebar={<aside>sidebar</aside>}
        list={<section>list</section>}
        detail={<section>detail</section>}
      />
    );

    expect(screen.getByTestId("workspace-grid").getAttribute("style")).toContain("grid-template-columns");
  });

  it("uses a two-pane layout with a detail overlay at narrow desktop widths", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900
    });

    render(
      <ThreePaneLayout
        sidebar={<aside>sidebar</aside>}
        list={<section>list</section>}
        detail={<section>detail</section>}
        detailOpen
        onCloseDetail={vi.fn()}
      />
    );

    expect(screen.getByTestId("workspace-grid")).toHaveAttribute("data-layout-mode", "two-pane");
    expect(screen.queryByTestId("resize-handle-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resize-handle-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("workspace-detail-overlay")).toBeInTheDocument();
  });

  it("falls back to stacked single-column layout only on truly narrow widths", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 700
    });

    render(
      <ThreePaneLayout
        sidebar={<aside>sidebar</aside>}
        list={<section>list</section>}
        detail={<section>detail</section>}
      />
    );

    expect(screen.getByTestId("workspace-grid")).toHaveAttribute("data-layout-mode", "single");
    expect(screen.queryByTestId("workspace-detail-overlay")).not.toBeInTheDocument();
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
    expect(window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY)).toContain("\"sidebar\":360");
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

    expect(window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY)).toContain("\"list\":280");
  });
});
