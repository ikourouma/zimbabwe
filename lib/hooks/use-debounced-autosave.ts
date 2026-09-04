import { useEffect, useRef } from "react";

/**
 * Fires `callback` ~`delayMs` after the last change to `deps` settles (Platform Feedback Batch v3,
 * Phase 5) — the mechanism behind every project wizard's "Saving…"/"Saved" indicator. Debounced
 * rather than on-blur so it works uniformly across text inputs, checkboxes, and multi-select chip
 * rows without wiring a blur handler onto every single field. Skips firing while `enabled` is false
 * (e.g. before step 0's minimum-required fields are filled, when there's nothing safe to persist
 * yet) and on the very first render (nothing changed yet — this is initial mount, not an edit).
 */
export function useDebouncedAutosave(callback: () => void | Promise<void>, deps: unknown[], delayMs = 1500, enabled = true) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (!enabled) return;
    const timer = setTimeout(() => {
      void savedCallback.current();
    }, delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
