"use client";

import { useId } from "react";
import { Sparkles } from "lucide-react";

export function OnboardingWelcome({
  onDismiss,
  onStart,
}: {
  onDismiss: () => void;
  onStart: () => void;
}) {
  const titleId = useId();

  return (
    <div
      aria-modal="true"
      className="onboarding-welcome-backdrop fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-labelledby={titleId}
    >
      <div className="onboarding-welcome-card w-full max-w-sm rounded-2xl border border-[var(--border-medium)] bg-[var(--panel-translucent-strong)] p-6 shadow-[var(--shadow-popover)] backdrop-blur">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--surface-subtle)]">
          <Sparkles className="h-5 w-5 text-[var(--text-secondary)]" />
        </div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]" id={titleId}>
          Welcome to AI Whiteboards
        </h2>
        <p className="mt-1.5 text-sm leading-5 text-[var(--text-muted)]">
          Build operating dashboards by asking questions on an infinite canvas. No chart builder, no templates to fill in — just describe what you need.
        </p>
        <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">
          Take a quick tour to see how it works.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            autoFocus
            className="h-9 w-full rounded-lg border border-[var(--primary)] bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)]"
            onClick={onStart}
            type="button"
          >
            Show me around
          </button>
          <button
            className="h-9 w-full rounded-lg text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]"
            onClick={onDismiss}
            type="button"
          >
            Skip, I&apos;ll explore myself
          </button>
        </div>
      </div>
    </div>
  );
}
