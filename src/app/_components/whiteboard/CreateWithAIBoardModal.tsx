"use client";

import { Sparkles, X } from "lucide-react";
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
  const handleFormKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLFormElement>) => {
      if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey) || isGenerating) {
        return;
      }

      event.preventDefault();
      event.currentTarget.requestSubmit();
    },
    [isGenerating],
  );
  const optionalFields: Array<{
    field: AiBoardBriefField;
    label: string;
    placeholder: string;
    rows: number;
  }> = [
    {
      field: "audience",
      label: "Team",
      placeholder: "Leadership team, engineering leads, sales managers...",
      rows: 2,
    },
    {
      field: "tasks",
      label: "Important tasks",
      placeholder: "Launch readiness, budget review, renewal risks, hiring plan...",
      rows: 2,
    },
    {
      field: "metrics",
      label: "Important metrics",
      placeholder: "Runway, ARR, activation, support SLA, token spend...",
      rows: 2,
    },
    {
      field: "dataSources",
      label: "Data sources",
      placeholder: "Docs, GitHub, email, Linear, Stripe, spreadsheets...",
      rows: 2,
    },
    {
      field: "notes",
      label: "Additional notes",
      placeholder: "Any constraints, risks, owners, deadlines, or context...",
      rows: 3,
    },
  ];

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <form
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[var(--border-medium)] bg-[var(--panel)] shadow-[var(--shadow-popover)]"
        onKeyDown={handleFormKeyDown}
        onSubmit={onSubmit}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Create with AI</h2>
            <p className="mt-0.5 text-xs font-medium text-[var(--text-muted)]">
              Sources are prompt context only; widgets use dummy preview data.
            </p>
          </div>
          <button
            aria-label="Close Create with AI"
            className="grid h-8 w-8 shrink-0 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGenerating}
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <label className="block">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Purpose</span>
            <textarea
              ref={purposeInputRef}
              aria-invalid={Boolean(error && !brief.purpose.trim())}
              className="mt-1 min-h-24 w-full resize-none rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm font-medium leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--focus-border)]"
              disabled={isGenerating}
              maxLength={1600}
              onChange={(event) => onUpdate("purpose", event.target.value)}
              placeholder="Plan a board for a weekly operating review, launch room, account health review..."
              value={brief.purpose}
            />
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {optionalFields.map((field) => (
              <label className={field.field === "notes" ? "block sm:col-span-2" : "block"} key={field.field}>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{field.label}</span>
                <textarea
                  className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--focus-border)]"
                  disabled={isGenerating}
                  maxLength={1600}
                  onChange={(event) => onUpdate(field.field, event.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows}
                  value={brief[field.field]}
                />
              </label>
            ))}
          </div>

          {error ? (
            <div className="mt-3 rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-sm font-semibold text-[var(--warning-text)]">
              {error}
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            className="h-9 rounded-md border border-transparent px-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGenerating}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--primary)] bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:border-[var(--border-strong)] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)]"
            disabled={isGenerating}
            type="submit"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isGenerating ? "Creating..." : "Create whiteboard"}
          </button>
        </footer>
      </form>
    </div>
  );
}
