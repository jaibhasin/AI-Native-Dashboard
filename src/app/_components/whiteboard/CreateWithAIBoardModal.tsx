"use client";

import { ChevronDown, Sparkles, X } from "lucide-react";
import { useCallback, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import type { AiBoardBrief } from "@/lib/ai-board-schemas";
import type { AiBoardBriefField } from "@/app/_lib/whiteboard/types";

export function CreateWithAIBoardModal({
  brief,
  error,
  isGenerating,
  onClose,
  onSubmit,
  onUpdate,
  purposeInputRef,
}: {
  brief: AiBoardBrief;
  error: string | null;
  isGenerating: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (field: AiBoardBriefField, value: string) => void;
  purposeInputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const canSubmit = Boolean(brief.purpose.trim()) && !isGenerating;
  const handleFormKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLFormElement>) => {
      if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey) || !canSubmit) {
        return;
      }

      event.preventDefault();
      event.currentTarget.requestSubmit();
    },
    [canSubmit],
  );
  const optionalFields: Array<{
    field: AiBoardBriefField;
    question: string;
    placeholder: string;
  }> = [
    {
      field: "audience",
      question: "Who is this board for?",
      placeholder: "Leadership, eng, sales",
    },
    {
      field: "tasks",
      question: "What work should it help with?",
      placeholder: "Risks, owners, decisions",
    },
    {
      field: "metrics",
      question: "Which metrics matter?",
      placeholder: "Runway, ARR, SLA",
    },
    {
      field: "dataSources",
      question: "What sources should it consider?",
      placeholder: "Docs, GitHub, Stripe",
    },
    {
      field: "notes",
      question: "Anything else to keep in mind?",
      placeholder: "Constraints, deadlines, context",
    },
  ];
  const hasOptionalContext = optionalFields.some((field) => brief[field.field].trim());

  return (
    <div className="ai-plan-overlay absolute inset-0 z-[80] flex items-start justify-center p-4 pt-20 sm:pt-24">
      <form
        aria-busy={isGenerating}
        className="ai-plan-modal w-full max-w-lg rounded-lg border border-[var(--border-medium)] bg-[var(--panel)] p-3 shadow-[var(--shadow-popover)]"
        onKeyDown={handleFormKeyDown}
        onSubmit={onSubmit}
      >
        <header className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Plan with AI</h2>
          </div>
          <button
            aria-label="Close Plan with AI"
            className="ai-plan-icon-button grid h-7 w-7 shrink-0 place-items-center rounded border border-transparent text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGenerating}
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="mt-3">
          <label className="block" htmlFor="ai-board-purpose">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">What are you planning?</span>
            <textarea
              ref={purposeInputRef}
              aria-invalid={Boolean(error && !brief.purpose.trim())}
              className="ai-plan-field mt-1 min-h-16 w-full resize-none rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm font-medium leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--focus-border)]"
              disabled={isGenerating}
              id="ai-board-purpose"
              maxLength={1600}
              name="purpose"
              onChange={(event) => onUpdate("purpose", event.target.value)}
              placeholder="Weekly launch review: readiness, risks, owners, launch KPIs"
              rows={2}
              value={brief.purpose}
            />
          </label>

          <details className="ai-plan-details mt-2" open={hasOptionalContext || undefined}>
            <summary className="ai-plan-summary flex cursor-pointer select-none items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)]">
              <span>Optional context</span>
              <ChevronDown className="ai-plan-summary-icon h-3.5 w-3.5 transition-transform" />
            </summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {optionalFields.map((field) => {
                const fieldId = `ai-board-${field.field}`;

                return (
                  <label
                    className={field.field === "notes" ? "block sm:col-span-2" : "block"}
                    htmlFor={fieldId}
                    key={field.field}
                  >
                    <span className="mb-1 block text-[11px] font-semibold leading-4 text-[var(--text-secondary)]">
                      {field.question}
                    </span>
                    <input
                      className="ai-plan-field h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--focus-border)]"
                      disabled={isGenerating}
                      id={fieldId}
                      maxLength={1600}
                      name={field.field}
                      onChange={(event) => onUpdate(field.field, event.target.value)}
                      placeholder={field.placeholder}
                      type="text"
                      value={brief[field.field]}
                    />
                  </label>
                );
              })}
            </div>
          </details>

          {error ? (
            <div className="mt-2 rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-sm font-semibold text-[var(--warning-text)]">
              {error}
            </div>
          ) : null}
          {isGenerating ? (
            <div
              className="ai-plan-status mt-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]"
              role="status"
            >
              Planning the board. Widgets will fill in after it opens.
            </div>
          ) : null}
        </div>

        <footer className="mt-3 flex items-center justify-end gap-2">
          <div className="flex justify-end gap-2">
            <button
              className="ai-plan-secondary-button h-8 rounded-md border border-transparent px-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isGenerating}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="ai-plan-primary-button inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--primary)] bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:border-[var(--border-strong)] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)]"
              disabled={!canSubmit}
              type="submit"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isGenerating ? "Planning..." : "Plan whiteboard"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
