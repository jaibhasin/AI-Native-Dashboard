"use client";

import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { WidgetBody } from "@/app/_components/whiteboard/WidgetFrame";
import {
  MIN_WIDGET_HEIGHT,
  noteColorOptions,
  noteColorStyles,
  WIDGET_AUTHOR_LABEL_HEIGHT,
  WIDGET_HEADER_HEIGHT,
} from "@/app/_lib/whiteboard/constants";
import type { BoardVisualAccent, NoteFocusTarget } from "@/app/_lib/whiteboard/types";
import {
  DEFAULT_NOTE_AUTHOR_NAME,
  type CanvasNote,
  type CanvasWidget,
} from "@/lib/dashboard-schemas";

function FocusNoteCard({
  editingFocus,
  isEditing,
  isNewlyCreated,
  note,
  onDelete,
  onEdit,
  onStopEditing,
  onUpdate,
}: {
  editingFocus: NoteFocusTarget | null;
  isEditing: boolean;
  isNewlyCreated: boolean;
  note: CanvasNote;
  onDelete: (id: string) => void;
  onEdit: (id: string, target: NoteFocusTarget) => void;
  onStopEditing: () => void;
  onUpdate: (
    id: string,
    nextNote: Partial<Pick<CanvasNote, "authorName" | "body" | "color" | "height" | "title" | "width">>,
  ) => void;
}) {
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const colorStyle = noteColorStyles[note.color];
  const displayAuthor = note.authorName.trim() || DEFAULT_NOTE_AUTHOR_NAME;
  const isEmpty = !note.title.trim() && !note.body.trim();

  useEffect(() => {
    if (!isEditing || !editingFocus) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const field = editingFocus === "title" ? titleInputRef.current : bodyInputRef.current;

      field?.focus();

      if (editingFocus === "body" && field instanceof HTMLTextAreaElement) {
        field.setSelectionRange(field.value.length, field.value.length);
      }

      if (editingFocus === "title" && field instanceof HTMLInputElement) {
        field.select();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [editingFocus, isEditing]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isNewlyCreated && isEmpty) {
        onDelete(note.id);
        return;
      }

      onStopEditing();
    },
    [isEmpty, isNewlyCreated, note.id, onDelete, onStopEditing],
  );

  return (
    <article
      className="flex overflow-hidden rounded-lg border text-[var(--text-primary)]"
      style={{
        background: `linear-gradient(180deg, var(--panel) 0%, ${colorStyle.background} 160%)`,
        borderColor: "var(--border-medium)",
        boxShadow: `0 8px 20px ${colorStyle.shadow}`,
      }}
    >
      <div className="w-1 shrink-0" style={{ background: colorStyle.accent }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
          {isEditing ? (
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
              onChange={(event) => onUpdate(note.id, { title: event.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Note title"
              ref={titleInputRef}
              value={note.title}
            />
          ) : (
            <button
              className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-[var(--text-primary)]"
              onClick={() => onEdit(note.id, "title")}
              type="button"
            >
              {note.title.trim() || "Untitled note"}
            </button>
          )}
          <button
            aria-label="Delete note"
            className="grid h-6 w-6 shrink-0 place-items-center rounded border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-secondary)]"
            onClick={() => onDelete(note.id)}
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        </header>
        <div className="px-3 py-2">
          {isEditing ? (
            <textarea
              className="min-h-[4.5rem] w-full resize-none bg-transparent text-sm leading-6 text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-faint)]"
              onChange={(event) => onUpdate(note.id, { body: event.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Write a note..."
              ref={bodyInputRef}
              value={note.body}
            />
          ) : (
            <button
              className="w-full text-left text-sm leading-6 text-[var(--text-secondary)]"
              onClick={() => onEdit(note.id, "body")}
              type="button"
            >
              {note.body.trim() || "Start typing..."}
            </button>
          )}
        </div>
        <footer className="flex items-center justify-between gap-2 border-t px-3 py-2" style={{ borderColor: "var(--border)" }}>
          <span className="truncate text-[10px] font-medium text-[var(--text-muted)]">{displayAuthor}</span>
          <div className="flex items-center gap-1">
            {noteColorOptions.map((color) => (
              <button
                aria-label={`Set note color to ${color}`}
                className={`h-3.5 w-3.5 rounded-full border transition ${
                  note.color === color ? "ring-2 ring-[var(--text-secondary)] ring-offset-1" : "opacity-70 hover:opacity-100"
                }`}
                key={color}
                onClick={() => onUpdate(note.id, { color })}
                style={{ background: noteColorStyles[color].accent }}
                type="button"
              />
            ))}
          </div>
        </footer>
      </div>
    </article>
  );
}

export function WidgetFocusOverlay({
  accent,
  editingNoteFocus,
  editingNoteId,
  focusedIndex,
  newlyCreatedNoteId,
  notes,
  onAddNote,
  onClose,
  onDeleteNote,
  onEditNote,
  onNext,
  onPrev,
  onStopEditingNote,
  onUpdateNote,
  totalWidgets,
  widget,
}: {
  accent: BoardVisualAccent | null;
  editingNoteFocus: NoteFocusTarget | null;
  editingNoteId: string | null;
  focusedIndex: number;
  newlyCreatedNoteId: string | null;
  notes: CanvasNote[];
  onAddNote: () => void;
  onClose: () => void;
  onDeleteNote: (id: string) => void;
  onEditNote: (id: string, target: NoteFocusTarget) => void;
  onNext: () => void;
  onPrev: () => void;
  onStopEditingNote: () => void;
  onUpdateNote: (
    id: string,
    nextNote: Partial<Pick<CanvasNote, "authorName" | "body" | "color" | "height" | "title" | "width">>,
  ) => void;
  totalWidgets: number;
  widget: CanvasWidget;
}) {
  const title = widget.exampleData?.title || widget.prompt;
  const subtitle = widget.exampleData?.subtitle?.trim();
  const displayAuthor = widget.authorName.trim() || DEFAULT_NOTE_AUTHOR_NAME;
  const widgetSurfaceHeight = Math.max(
    MIN_WIDGET_HEIGHT - WIDGET_AUTHOR_LABEL_HEIGHT,
    widget.height - WIDGET_AUTHOR_LABEL_HEIGHT,
  );
  const statusLabel = widget.status === "streaming" ? "Generating" : widget.status === "error" ? "Error" : null;

  return (
    <div
      aria-label="Widget focus view"
      aria-modal="true"
      className="widget-focus-backdrop absolute inset-0 z-[60] flex flex-col backdrop-blur-sm"
      role="dialog"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border-medium)] bg-[var(--panel-translucent)] px-4 py-3 backdrop-blur sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</div>
          {subtitle ? <div className="truncate text-xs text-[var(--text-muted)]">{subtitle}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous widget"
            className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={totalWidgets <= 1}
            onClick={onPrev}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[4.5rem] text-center text-xs font-medium text-[var(--text-muted)]">
            {focusedIndex + 1} / {totalWidgets}
          </span>
          <button
            aria-label="Next widget"
            className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={totalWidgets <= 1}
            onClick={onNext}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            aria-label="Close focus view"
            className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-6">
          <div className="mb-2 text-[10px] font-medium text-[var(--text-muted)]">{displayAuthor}</div>
          <article
            className="relative mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-xl border bg-[var(--panel)] shadow-[var(--shadow-widget)]"
            style={{
              borderColor: accent?.border ?? "var(--border-medium)",
              boxShadow: accent ? "var(--shadow-widget-accent)" : "var(--shadow-widget)",
            }}
          >
            {accent ? (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
                style={{ background: accent.accent }}
              />
            ) : null}
            <header
              className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--panel)] px-3"
              style={{
                background: accent ? `linear-gradient(90deg, ${accent.surface}, var(--panel) 72%)` : undefined,
              }}
            >
              <div className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">{title}</div>
              {subtitle ? (
                <div className="truncate text-xs text-[var(--text-muted)]">· {subtitle}</div>
              ) : null}
              {statusLabel ? (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                  {statusLabel}
                </span>
              ) : null}
            </header>
            <div
              className="min-h-0 flex-1 overflow-hidden"
              style={{ height: widgetSurfaceHeight, minHeight: MIN_WIDGET_HEIGHT - WIDGET_HEADER_HEIGHT }}
            >
              <WidgetBody onContentMeasured={() => {}} widget={widget} />
            </div>
          </article>
        </section>

        <aside className="flex w-full shrink-0 flex-col border-t border-[var(--border-medium)] bg-[var(--panel-translucent)] backdrop-blur lg:w-80 lg:border-l lg:border-t-0 xl:w-96">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-medium)] px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Notes</div>
              <div className="text-xs text-[var(--text-muted)]">
                {notes.length === 0 ? "No notes yet" : `${notes.length} linked to this widget`}
              </div>
            </div>
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)]"
              onClick={onAddNote}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add note
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {notes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                Add context, decisions, or follow-ups for this widget.
              </div>
            ) : (
              notes.map((note) => (
                <FocusNoteCard
                  editingFocus={editingNoteId === note.id ? editingNoteFocus : null}
                  isEditing={editingNoteId === note.id}
                  isNewlyCreated={newlyCreatedNoteId === note.id}
                  key={note.id}
                  note={note}
                  onDelete={onDeleteNote}
                  onEdit={onEditNote}
                  onStopEditing={onStopEditingNote}
                  onUpdate={onUpdateNote}
                />
              ))
            )}
          </div>
        </aside>
      </div>

      <footer className="pointer-events-none flex shrink-0 items-center justify-center gap-2 border-t border-[var(--border-medium)] bg-[var(--panel-translucent)] px-4 py-2 text-xs font-medium text-[var(--text-muted)] backdrop-blur">
        <span>
          <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">←</span>
          <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">→</span>
          to switch widgets
        </span>
        <span className="h-3 w-px bg-[var(--border-strong)]" />
        <span>
          <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">Esc</span>
          to close
        </span>
      </footer>
    </div>
  );
}
