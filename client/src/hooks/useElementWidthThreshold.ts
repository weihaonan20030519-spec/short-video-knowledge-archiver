import { useEffect, useRef, useState } from "react";

type WidthThresholdMode = "max" | "min";

export function useElementWidthThreshold<T extends HTMLElement>(
  threshold: number,
  mode: WidthThresholdMode
) {
  const ref = useRef<T | null>(null);
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateMatch = (width: number) => {
      setMatches(mode === "max" ? width <= threshold : width >= threshold);
    };

    updateMatch(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      updateMatch(entry?.contentRect.width ?? node.getBoundingClientRect().width);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [mode, threshold]);

  return [ref, matches] as const;
}
