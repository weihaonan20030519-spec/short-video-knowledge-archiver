import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAppI18n } from "../hooks/useAppI18n";

interface ThreePaneLayoutProps {
  sidebar: ReactNode;
  list: ReactNode;
  detail: ReactNode;
  detailOpen?: boolean;
  onCloseDetail?: () => void;
}

type DesktopPaneWidths = {
  sidebar: number;
  list: number;
};

type ResizeHandle = "sidebar" | "list";
type LayoutMode = "single" | "two-pane" | "three-pane";

const WORKSPACE_LAYOUT_STORAGE_KEY = "svka:workspace-layout:v1";
const TWO_PANE_BREAKPOINT_PX = 768;
const THREE_PANE_BREAKPOINT_PX = 1024;
const DEFAULT_WIDTHS: DesktopPaneWidths = {
  sidebar: 280,
  list: 360
};
const MIN_WIDTHS = {
  sidebar: 220,
  list: 280,
  detail: 320
};
const HANDLE_WIDTH_PX = 12;

function readStoredWidths(): DesktopPaneWidths {
  if (typeof window === "undefined") {
    return DEFAULT_WIDTHS;
  }

  try {
    const stored = window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_WIDTHS;
    }

    const parsed = JSON.parse(stored) as Partial<DesktopPaneWidths>;
    if (
      typeof parsed.sidebar === "number" &&
      Number.isFinite(parsed.sidebar) &&
      typeof parsed.list === "number" &&
      Number.isFinite(parsed.list)
    ) {
      return {
        sidebar: parsed.sidebar,
        list: parsed.list
      };
    }
  } catch {
    return DEFAULT_WIDTHS;
  }

  return DEFAULT_WIDTHS;
}

function getLayoutMode(width: number): LayoutMode {
  if (width >= THREE_PANE_BREAKPOINT_PX) {
    return "three-pane";
  }

  if (width >= TWO_PANE_BREAKPOINT_PX) {
    return "two-pane";
  }

  return "single";
}

function clampWidths(widths: DesktopPaneWidths, paneSpace: number): DesktopPaneWidths {
  const safeSidebar = Number.isFinite(widths.sidebar) ? widths.sidebar : DEFAULT_WIDTHS.sidebar;
  const safeList = Number.isFinite(widths.list) ? widths.list : DEFAULT_WIDTHS.list;
  const nextList = Math.min(
    Math.max(safeList, MIN_WIDTHS.list),
    Math.max(MIN_WIDTHS.list, paneSpace - MIN_WIDTHS.sidebar - MIN_WIDTHS.detail)
  );
  const nextSidebar = Math.min(
    Math.max(safeSidebar, MIN_WIDTHS.sidebar),
    Math.max(MIN_WIDTHS.sidebar, paneSpace - nextList - MIN_WIDTHS.detail)
  );

  return {
    sidebar: nextSidebar,
    list: nextList
  };
}

function getDesktopPaneSpace(containerWidth: number) {
  return Math.max(containerWidth - HANDLE_WIDTH_PX * 2, MIN_WIDTHS.sidebar + MIN_WIDTHS.list + MIN_WIDTHS.detail);
}

export function ThreePaneLayout({
  sidebar,
  list,
  detail,
  detailOpen = false,
  onCloseDetail
}: ThreePaneLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    handle: ResizeHandle;
    startX: number;
    widths: DesktopPaneWidths;
  } | null>(null);
  const [desktopWidths, setDesktopWidths] = useState<DesktopPaneWidths>(() => readStoredWidths());
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() =>
    typeof window === "undefined" ? "single" : getLayoutMode(window.innerWidth)
  );
  const { t } = useAppI18n();
  const isThreePane = layoutMode === "three-pane";
  const isTwoPane = layoutMode === "two-pane";

  const measureContainerWidth = () => {
    if (containerRef.current) {
      const measured = containerRef.current.getBoundingClientRect().width;
      if (measured > 0) {
        return measured;
      }
    }

    if (typeof window !== "undefined") {
      return Math.min(window.innerWidth - 48, 1800);
    }

    return 1800;
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      const nextLayoutMode = getLayoutMode(window.innerWidth);
      setLayoutMode(nextLayoutMode);

      if (nextLayoutMode === "three-pane") {
        const paneSpace = getDesktopPaneSpace(measureContainerWidth());
        setDesktopWidths((current) => clampWidths(current, paneSpace));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isThreePane) {
      return;
    }

    window.localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(desktopWidths));
  }, [desktopWidths, isThreePane]);

  useEffect(() => {
    if (!isThreePane) {
      return;
    }

    const applyDragDelta = (clientX: number) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const safeClientX = Number.isFinite(clientX) ? clientX : dragState.startX;
      const deltaX = safeClientX - dragState.startX;
      const paneSpace = getDesktopPaneSpace(measureContainerWidth());
      const nextWidths =
        dragState.handle === "sidebar"
          ? {
              ...dragState.widths,
              sidebar: dragState.widths.sidebar + deltaX
            }
          : {
              ...dragState.widths,
              list: dragState.widths.list + deltaX
            };

      setDesktopWidths(clampWidths(nextWidths, paneSpace));
    };

    const handlePointerMove = (event: PointerEvent) => {
      applyDragDelta(event.clientX);
    };

    const handleMouseMove = (event: MouseEvent) => {
      applyDragDelta(event.clientX);
    };

    const stopDragging = () => {
      dragStateRef.current = null;
      window.document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [isThreePane]);

  const gridTemplateColumns = useMemo(() => {
    if (layoutMode === "three-pane") {
      return `${desktopWidths.sidebar}px ${HANDLE_WIDTH_PX}px ${desktopWidths.list}px ${HANDLE_WIDTH_PX}px minmax(${MIN_WIDTHS.detail}px, 1fr)`;
    }

    if (layoutMode === "two-pane") {
      return `minmax(${MIN_WIDTHS.sidebar}px, 280px) minmax(0, 1fr)`;
    }

    return undefined;
  }, [desktopWidths, layoutMode]);

  const startDragging = (handle: ResizeHandle, clientX: number) => {
    if (!isThreePane) {
      return;
    }

    dragStateRef.current = {
      handle,
      startX: Number.isFinite(clientX) ? clientX : 0,
      widths: desktopWidths
    };
    window.document.body.style.userSelect = "none";
  };

  return (
    <div className="relative h-dvh min-h-0 overflow-hidden p-4 md:p-6" data-testid="workspace-shell">
      <div
        className={`mx-auto grid h-full min-h-0 min-w-0 max-w-[1800px] ${
          layoutMode === "single" ? "gap-4 overflow-y-auto" : "gap-0 overflow-hidden"
        }`}
        data-testid="workspace-grid"
        data-layout-mode={layoutMode}
        ref={containerRef}
        style={gridTemplateColumns ? { gridTemplateColumns } : undefined}
      >
        <div
          className={`min-h-[240px] min-w-0 ${
            layoutMode === "single" ? "" : "h-full min-h-0 overflow-hidden pr-4"
          }`}
          data-testid="workspace-pane-sidebar"
        >
          {sidebar}
        </div>

        {isThreePane ? (
          <div className="flex h-full items-stretch justify-center">
            <button
              aria-label={t.detail.resizeSidebar}
              className="group flex w-full cursor-col-resize items-center justify-center"
              data-testid="resize-handle-sidebar"
              onMouseDown={(event) => startDragging("sidebar", event.clientX)}
              onPointerDown={(event) => startDragging("sidebar", event.clientX)}
              type="button"
            >
              <span className="h-20 w-[3px] rounded-full bg-slate-200 transition group-hover:bg-slate-400" />
            </button>
          </div>
        ) : null}

        <div
          className={`min-h-[240px] min-w-0 ${
            layoutMode === "single" ? "" : "h-full min-h-0 overflow-hidden"
          } ${isThreePane ? "px-4" : ""}`}
          data-testid="workspace-pane-list"
        >
          {list}
        </div>

        {isThreePane ? (
          <>
            <div className="flex h-full items-stretch justify-center">
              <button
                aria-label={t.detail.resizeList}
                className="group flex w-full cursor-col-resize items-center justify-center"
                data-testid="resize-handle-list"
                onMouseDown={(event) => startDragging("list", event.clientX)}
                onPointerDown={(event) => startDragging("list", event.clientX)}
                type="button"
              >
                <span className="h-20 w-[3px] rounded-full bg-slate-200 transition group-hover:bg-slate-400" />
              </button>
            </div>

            <div className="min-h-[240px] min-w-0 h-full min-h-0 overflow-hidden pl-4" data-testid="workspace-pane-detail">
              {detail}
            </div>
          </>
        ) : null}

        {layoutMode === "single" ? (
          <div className="min-h-[240px] min-w-0" data-testid="workspace-pane-detail">
            {detail}
          </div>
        ) : null}
      </div>

      {isTwoPane && detailOpen ? (
        <div
          className="absolute inset-y-4 right-4 z-20 hidden w-[min(46vw,520px)] min-w-[360px] md:block"
          data-testid="workspace-detail-overlay"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-slate-700/70 bg-slate-950/85 p-2 shadow-[0_20px_80px_rgba(15,23,42,0.55)] backdrop-blur-md">
            <div className="flex items-center justify-end px-2 pb-2">
              <button
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                onClick={onCloseDetail}
                type="button"
              >
                {t.common.close}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden" data-testid="workspace-detail-overlay-panel">
              {detail}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { WORKSPACE_LAYOUT_STORAGE_KEY };
