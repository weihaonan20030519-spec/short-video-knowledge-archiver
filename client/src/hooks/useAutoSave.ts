import { useEffect, useRef } from "react";

export function useAutoSave<T>(save: (value: T) => Promise<void> | void, delay = 400) {
  const timeoutRef = useRef<number | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (value: T) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      void saveRef.current(value);
    }, delay);
  };
}
