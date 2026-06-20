"use client";

import { useId } from "react";
import { Sparkles, X } from "lucide-react";

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
      className="onboarding-welcome-backdrop fixed inset-0 z-[90] flex items-end justify-center p-6 pb-10 sm:items-center sm:pb-6"
      role="dialog"
      aria-labelledby={titleId}
    >
      <div className="onboarding-welcome-card relative w-full max-w-[22rem] rounded-xl border border-[var(--border-medium)] bg-[var(--panel-translucent-strong)] px-6 py-6 shadow-[var(--shadow-popover)] backdrop-blur">
        <button
          aria-label="Close welcome"
          className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-secondary)]"
          onClick={onDismiss}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-2 pr-8">
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]" id={titleId}>
            Welcome to AI Native Whiteboards
          </h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
          You&apos;re on a blank canvas. A short walkthrough covers the basics — about a minute.
        </p>

        <div className="mt-6 space-y-2">
          <button
            autoFocus
            className="h-9 w-full rounded-lg border border-[var(--primary)] bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)]"
            onClick={onStart}
            type="button"
          >
            Continue
          </button>
          <button
            className="h-8 w-full text-sm font-medium text-[var(--text-faint)] transition hover:text-[var(--text-muted)]"
            onClick={onDismiss}
            type="button"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
