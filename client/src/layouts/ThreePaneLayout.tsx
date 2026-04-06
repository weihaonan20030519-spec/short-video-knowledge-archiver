import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAppI18n } from "../hooks/useAppI18n";

interface ThreePaneLayoutProps {
  sidebar: ReactNode;
  list: ReactNode;
  detail: ReactNode;
}

type DesktopPaneWidths = {
  sidebar: number;
  list: number;
};

type ResizeHandle = "sidebar" | "list";

const WORKSPACE_LAYOUT_STORAGE_KEY = "svka:workspace-layout:v1";
const DESKTOP_BREAKPOINT_PX = 1280;
const DEFAULT_WIDTHS: DesktopPaneWidths = {
  sidebar: 300,
  list: 420
};
const MIN_WIDTHS = {
  sidebar: 260,
  list: 340,
  detail: 420
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

export function ThreePaneLayout({ sidebar, list, detail }: ThreePaneLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    handle: ResizeHandle;
    startX: number;
    widths: DesktopPaneWidths;
  } | null>(null);
  const [desktopWidths, setDesktopWidths] = useState<DesktopPaneWidths>(() => readStoredWidths());
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth >= DESKTOP_BREAKPOINT_PX
  );
  const { t } = useAppI18n();

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
      const nextIsDesktop = window.innerWidth >= DESKTOP_BREAKPOINT_PX;
      setIsDesktop(nextIsDesktop);

      if (nextIsDesktop) {
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
    if (typeof window === "undefined" || !isDesktop) {
      return;
    }

    window.localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(desktopWidths));
  }, [desktopWidths, isDesktop]);

  useEffect(() => {
    if (!isDesktop) {
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
  }, [isDesktop]);

  const gridTemplateColumns = useMemo(() => {
    if (!isDesktop) {
      return undefined;
    }

    return `${desktopWidths.sidebar}px ${HANDLE_WIDTH_PX}px ${desktopWidths.list}px ${HANDLE_WIDTH_PX}px minmax(${MIN_WIDTHS.detail}px, 1fr)`;
  }, [desktopWidths, isDesktop]);

  const startDragging = (handle: ResizeHandle, clientX: number) => {
    if (!isDesktop) {
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
    <div
      className="h-dvh min-h-0 overflow-hidden p-4 md:p-6"
      data-testid="workspace-shell"
    >
      <div
        className="mx-auto grid h-full min-h-0 max-w-[1800px] gap-4 overflow-y-auto xl:gap-0 xl:overflow-hidden"
        data-testid="workspace-grid"
        ref={containerRef}
        style={gridTemplateColumns ? { gridTemplateColumns } : undefined}
      >
        <div
          className="min-h-[240px] xl:h-full xl:min-h-0 xl:overflow-hidden xl:pr-4"
          data-testid="workspace-pane-sidebar"
        >
          {sidebar}
        </div>

        <div className="hidden xl:flex xl:h-full xl:items-stretch xl:justify-center">
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

        <div
          className="min-h-[240px] xl:h-full xl:min-h-0 xl:overflow-hidden xl:px-4"
          data-testid="workspace-pane-list"
        >
          {list}
        </div>

        <div className="hidden xl:flex xl:h-full xl:items-stretch xl:justify-center">
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

        <div
          className="min-h-[240px] xl:h-full xl:min-h-0 xl:overflow-hidden xl:pl-4"
          data-testid="workspace-pane-detail"
        >
          {detail}
        </div>
      </div>
    </div>
  );
}

export { WORKSPACE_LAYOUT_STORAGE_KEY };
