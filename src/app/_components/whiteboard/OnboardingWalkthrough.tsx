"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ONBOARDING_STEP_COUNT } from "@/app/_lib/whiteboard/useOnboardingWalkthrough";
import { ONBOARDING_STEPS } from "@/app/_lib/whiteboard/onboarding-steps";

type TargetRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

const TOOLTIP_GAP = 12;
const TOOLTIP_MAX_WIDTH = 320;
const VIEWPORT_MARGIN = 16;

function measureTarget(selector: string): TargetRect | null {
  const element = document.querySelector(selector);

  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

function tooltipPosition(
  rect: TargetRect,
  placement: "top" | "bottom",
  tooltipHeight: number,
) {
  const centerX = rect.left + rect.width / 2;
  let left = centerX - TOOLTIP_MAX_WIDTH / 2;
  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, window.innerWidth - TOOLTIP_MAX_WIDTH - VIEWPORT_MARGIN),
  );

  const spaceBelow = window.innerHeight - (rect.top + rect.height + TOOLTIP_GAP);
  const spaceAbove = rect.top - TOOLTIP_GAP;
  const resolvedPlacement =
    placement === "bottom" && spaceBelow < tooltipHeight && spaceAbove > spaceBelow ? "top" : placement;
  const top =
    resolvedPlacement === "bottom"
      ? rect.top + rect.height + TOOLTIP_GAP
      : rect.top - TOOLTIP_GAP - tooltipHeight;

  return {
    left,
    placement: resolvedPlacement,
    top: Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - tooltipHeight - VIEWPORT_MARGIN)),
  };
}

export function OnboardingWalkthrough({
  onDismiss,
  onNext,
  step,
}: {
  onDismiss: () => void;
  onNext: () => void;
  step: number;
}) {
  const titleId = useId();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(160);
  const stepConfig = ONBOARDING_STEPS[step];
  const isLastStep = step >= ONBOARDING_STEP_COUNT - 1;

  const updateLayout = useCallback(() => {
    if (!stepConfig) {
      setTargetRect(null);
      return;
    }

    const rect = measureTarget(stepConfig.target);
    setTargetRect(rect);

    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight);
    }
  }, [stepConfig]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
      }
    };

    let frame = requestAnimationFrame(updateLayout);

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateLayout);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", scheduleUpdate);

    const scrollTargets = [
      window,
      document.querySelector("[data-board-tabs-scroll]"),
      document.querySelector("[data-canvas-viewport]"),
    ];

    scrollTargets.forEach((target) => {
      target?.addEventListener("scroll", scheduleUpdate, { passive: true });
    });

    const resizeObserver = new ResizeObserver(scheduleUpdate);

    const targetElement = stepConfig ? document.querySelector(stepConfig.target) : null;

    if (targetElement) {
      resizeObserver.observe(targetElement);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", scheduleUpdate);
      scrollTargets.forEach((target) => {
        target?.removeEventListener("scroll", scheduleUpdate);
      });
      resizeObserver.disconnect();
    };
  }, [onDismiss, stepConfig, updateLayout]);

  if (!stepConfig) {
    return null;
  }

  const tooltipLayout = targetRect ? tooltipPosition(targetRect, stepConfig.placement, tooltipHeight) : null;

  return (
    <div aria-hidden={false} className="onboarding-root pointer-events-none fixed inset-0 z-[90]">
      <div
        aria-describedby={`${titleId}-body`}
        aria-labelledby={titleId}
        className={`onboarding-card pointer-events-auto fixed w-[min(100vw-2rem,20rem)] rounded-lg border border-[var(--border-medium)] bg-[var(--panel-translucent-strong)] p-3 shadow-[var(--shadow-popover)] backdrop-blur ${
          tooltipLayout ? "" : "bottom-6 left-1/2 -translate-x-1/2"
        }`}
        key={step}
        ref={tooltipRef}
        role="dialog"
        style={
          tooltipLayout
            ? {
                left: tooltipLayout.left,
                top: tooltipLayout.top,
              }
            : undefined
        }
      >
        <div className="mb-3 flex items-center gap-1.5" role="presentation">
          {Array.from({ length: ONBOARDING_STEP_COUNT }, (_, index) => (
            <span
              className={`h-1.5 rounded-full transition-all duration-150 ${
                index === step
                  ? "w-4 bg-[var(--primary)]"
                  : "w-1.5 bg-[var(--border-strong)]"
              }`}
              key={index}
            />
          ))}
        </div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]" id={titleId}>
          {stepConfig.title}
        </h2>
        <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]" id={`${titleId}-body`}>
          {stepConfig.body}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            className="h-8 rounded-md px-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]"
            onClick={onDismiss}
            type="button"
          >
            Skip tour
          </button>
          <button
            className="h-8 rounded-md border border-[var(--primary)] bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)]"
            onClick={onNext}
            type="button"
          >
            {isLastStep ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
