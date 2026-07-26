"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AuthTransitionPhase = "idle" | "signing_in" | "signing_out";

const MIN_DURATION_MS = 800;

interface AuthTransitionContextValue {
  phase: AuthTransitionPhase;
  runSignInTransition: <T>(action: () => Promise<T>) => Promise<T>;
  runSignOutTransition: <T>(action: () => Promise<T>) => Promise<T>;
}

const AuthTransitionContext = createContext<AuthTransitionContextValue | null>(null);

async function runWithMinDuration<T>(phase: AuthTransitionPhase, action: () => Promise<T>, setPhase: (p: AuthTransitionPhase) => void) {
  setPhase(phase);
  const started = Date.now();
  try {
    return await action();
  } finally {
    const elapsed = Date.now() - started;
    if (elapsed < MIN_DURATION_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_DURATION_MS - elapsed));
    }
    setPhase("idle");
  }
}

export function AuthTransitionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthTransitionPhase>("idle");

  const runSignInTransition = useCallback(
    <T,>(action: () => Promise<T>) => runWithMinDuration("signing_in", action, setPhase),
    [],
  );

  const runSignOutTransition = useCallback(
    <T,>(action: () => Promise<T>) => runWithMinDuration("signing_out", action, setPhase),
    [],
  );

  const value = useMemo(
    () => ({ phase, runSignInTransition, runSignOutTransition }),
    [phase, runSignInTransition, runSignOutTransition],
  );

  return <AuthTransitionContext.Provider value={value}>{children}</AuthTransitionContext.Provider>;
}

export function useAuthTransition() {
  const ctx = useContext(AuthTransitionContext);
  if (!ctx) throw new Error("useAuthTransition must be used within AuthTransitionProvider");
  return ctx;
}
