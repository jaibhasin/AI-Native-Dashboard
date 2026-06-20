"use client";

import { useCallback, useEffect, useState } from "react";
import { ONBOARDING_STORAGE_KEY } from "@/app/_lib/whiteboard/constants";

export const ONBOARDING_STEP_COUNT = 3;
// step -1 = welcome screen, 0..2 = tour steps
export const ONBOARDING_WELCOME_STEP = -1;

export function isOnboardingCompleted() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "completed";
}

export function useOnboardingWalkthrough() {
  const [step, setStep] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (isOnboardingCompleted()) {
        setHasHydrated(true);
        return;
      }

      setStep(ONBOARDING_WELCOME_STEP);
      setIsActive(true);
      setHasHydrated(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const complete = useCallback(() => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "completed");
    setIsActive(false);
    setStep(null);
  }, []);

  const dismiss = useCallback(() => {
    complete();
  }, [complete]);

  const next = useCallback(() => {
    setStep((current) => {
      if (current === null) {
        return null;
      }

      if (current >= ONBOARDING_STEP_COUNT - 1) {
        complete();
        return null;
      }

      return current + 1;
    });
  }, [complete]);

  const startTour = useCallback(() => {
    setStep(0);
  }, []);

  return {
    dismiss,
    hasHydrated,
    isActive,
    next,
    startTour,
    step,
  };
}
