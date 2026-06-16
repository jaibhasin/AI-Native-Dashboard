"use client";

import { GripVertical, Maximize2, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
} from "react";
import {
  NOTE_AUTHOR_LABEL_HEIGHT,
  noteColorLabels,
  noteColorOptions,
  noteColorStyles,
} from "@/app/_lib/whiteboard/constants";
import { noteTextSize } from "@/app/_lib/whiteboard/geometry";
import type { NoteFocusTarget, WidgetInteraction } from "@/app/_lib/whiteboard/types";
import { DEFAULT_NOTE_AUTHOR_NAME, type CanvasNote } from "@/lib/dashboard-schemas";

export function NoteFrame({
  focusTarget,
  isEditing,
  isManuallySized,
  isNewlyCreated,
  note,
  onBringToFront,
  onDelete,
  onEdit,
  onFocusHandled,
  onStopEditing,
  onUpdate,
  onStartInteraction,
  scale,
}: {
  focusTarget: NoteFocusTarget | null;
  isEditing: boolean;
  isManuallySized: boolean;
  isNewlyCreated: boolean;
  note: CanvasNote;
  onBringToFront: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, target: NoteFocusTarget) => void;
  onFocusHandled: () => void;
  onStopEditing: () => void;
  onUpdate: (
    id: string,
    nextNote: Partial<Pick<CanvasNote, "authorName" | "body" | "color" | "height" | "title" | "width">>,
  ) => void;
  onStartInteraction: (event: PointerEvent<HTMLElement>, interaction: WidgetInteraction) => void;
  scale: number;
}) {
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const colorStyle = noteColorStyles[note.color];
  const displayTitle = note.title.trim() || "Untitled note";
  const displayBody = note.body.trim() || "Start typing...";
  const displayAuthor = note.authorName.trim() || DEFAULT_NOTE_AUTHOR_NAME;
  const isEmpty = !note.title.trim() && !note.body.trim();
  const noteSurfaceHeight = Math.max(0, note.height - NOTE_AUTHOR_LABEL_HEIGHT);

  useEffect(() => {
    if (isManuallySized) {
      return;
    }

    const fittedSize = noteTextSize(note.title, note.body, displayAuthor);

    if (fittedSize.width === note.width && fittedSize.height === note.height) {
      return;
    }

    onUpdate(note.id, {
      body: note.body,
      title: note.title,
    });
  }, [displayAuthor, isManuallySized, note.body, note.height, note.id, note.title, note.width, onUpdate]);

  useEffect(() => {
    if (!isEditing || !focusTarget) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const field = focusTarget === "title" ? titleInputRef.current : bodyInputRef.current;

      field?.focus();

      if (focusTarget === "body" && field instanceof HTMLTextAreaElement) {
        field.setSelectionRange(field.value.length, field.value.length);
      }

      if (focusTarget === "title" && field instanceof HTMLInputElement) {
        field.select();
      }

      onFocusHandled();
    });

    return () => cancelAnimationFrame(frame);
  }, [focusTarget, isEditing, onFocusHandled]);

  const startDrag = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      onStartInteraction(event, {
        id: note.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: note.x,
        startY: note.y,
        type: "note-drag",
      });
    },
    [note.id, note.x, note.y, onStartInteraction],
  );

  const startResize = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      onStartInteraction(event, {
        id: note.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startHeight: note.height,
        startWidth: note.width,
        type: "note-resize",
      });
    },
    [note.height, note.id, note.width, onStartInteraction],
  );

  const handleEditingKeyDown = useCallback(
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
    <div
      className="absolute z-20"
      data-note
      onPointerDownCapture={(event) => {
        if (event.button === 0) {
          onBringToFront(note.id);
        }
      }}
      style={{
        height: note.height * scale,
        left: note.x * scale,
        top: note.y * scale,
        width: note.width * scale,
      }}
    >
      <div
        className="group"
        style={{
          height: note.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: note.width,
        }}
      >
        <div
          className={`mb-1 truncate px-1 text-[10px] font-medium leading-3 text-[var(--text-muted)] transition ${
            isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          {displayAuthor}
        </div>
        <article
          className="group relative flex overflow-visible rounded-[5px] border text-[var(--text-primary)]"
          style={{
            background: `linear-gradient(180deg, var(--panel) 0%, ${colorStyle.background} 160%)`,
            borderColor: "var(--border-medium)",
            boxShadow: `0 10px 24px ${colorStyle.shadow}, var(--shadow-note-inset)`,
            height: noteSurfaceHeight,
            width: note.width,
          }}
        >
          <div className="w-1 shrink-0" style={{ background: colorStyle.accent }} />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="relative flex h-7 shrink-0 items-center border-b px-2" style={{ borderColor: "var(--border)" }}>
              <button
                aria-label="Move note"
                className={`absolute left-1 top-1 grid h-5 w-5 cursor-grab place-items-center rounded bg-[var(--panel-translucent)] text-[var(--text-faint)] transition hover:bg-[var(--panel-translucent-strong)] hover:text-[var(--text-secondary)] focus:opacity-100 active:cursor-grabbing ${
                  isEditing ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                }`}
                data-note-control
                onPointerDown={startDrag}
                title="Move"
                type="button"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <input
                    aria-label="Note title"
                    className="h-5 w-full rounded border border-transparent bg-transparent px-6 text-xs font-semibold text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--border-medium)] focus:bg-[var(--panel-translucent)]"
                    data-note-control
                    id={`${note.id}-title`}
                    maxLength={48}
                    name="note-title"
                    onChange={(event) => onUpdate(note.id, { title: event.target.value })}
                    onKeyDown={handleEditingKeyDown}
                    placeholder="Title"
                    ref={titleInputRef}
                    value={note.title}
                  />
                ) : (
                  <button
                    className={`block w-full truncate rounded px-0.5 py-0.5 text-left text-xs font-semibold transition hover:bg-white/60 group-hover:px-6 ${
                      note.title.trim() ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                    }`}
                    data-note-control
                    onClick={() => onEdit(note.id, "title")}
                    title={displayTitle}
                    type="button"
                  >
                    {displayTitle}
                  </button>
                )}
              </div>
              <button
                aria-label="Delete note"
                className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded border border-transparent bg-[var(--panel-translucent)] text-[var(--text-muted)] transition hover:border-[var(--border)] hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] focus:opacity-100 ${
                  isEditing ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
                }`}
                data-note-control
                onClick={() => onDelete(note.id)}
                title="Delete"
                type="button"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden p-1.5">
              {isEditing ? (
                <div className="flex h-full flex-col gap-2">
                  <textarea
                    aria-label="Note body"
                    className="min-h-0 flex-1 resize-none rounded border border-transparent bg-[var(--panel-translucent)] px-1.5 py-1 text-[12px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--border-medium)] focus:bg-[var(--panel-translucent-strong)]"
                    data-note-control
                    id={`${note.id}-body`}
                    maxLength={280}
                    name="note-body"
                    onChange={(event) => onUpdate(note.id, { body: event.target.value })}
                    onKeyDown={handleEditingKeyDown}
                    placeholder="Write a note..."
                    ref={bodyInputRef}
                    value={note.body}
                  />
                </div>
              ) : (
                <button
                  className={`block h-full w-full overflow-hidden rounded px-1 py-0.5 text-left text-[12px] font-medium leading-5 transition hover:bg-white/45 ${
                    isEmpty ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
                  }`}
                  data-note-control
                  onClick={() => onEdit(note.id, "body")}
                  type="button"
                >
                  <span className={isEmpty ? "italic" : "line-clamp-5"}>{displayBody}</span>
                </button>
              )}
            </div>
          </div>
          {isEditing ? (
            <div
              className="absolute right-[-32px] top-10 flex flex-col gap-1"
              data-note-control
            >
              {noteColorOptions.map((color) => {
                const optionStyle = noteColorStyles[color];
                const isSelected = color === note.color;

                return (
                  <button
                    aria-label={`${color} note color`}
                    aria-pressed={isSelected}
                    className="relative h-4 w-4 overflow-hidden rounded-full border bg-[var(--panel)] transition"
                    data-note-control
                    key={color}
                    onClick={() => onUpdate(note.id, { color })}
                    style={{
                      borderColor: isSelected ? "var(--focus-border)" : optionStyle.border,
                      boxShadow: isSelected ? `0 0 0 2px ${optionStyle.border}` : undefined,
                    }}
                    title={noteColorLabels[color]}
                    type="button"
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-[28%]"
                      style={{ backgroundColor: optionStyle.accent }}
                    />
                    <span
                      className="absolute inset-y-0 left-[28%] right-0"
                      style={{
                        background: `linear-gradient(180deg, var(--panel) 0%, ${optionStyle.background} 160%)`,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
          <button
            aria-label="Resize note"
            className={`absolute bottom-1.5 right-1.5 grid h-5 w-5 cursor-nwse-resize place-items-center rounded border border-[var(--border-strong)] bg-[var(--panel-translucent-strong)] text-[var(--text-muted)] shadow-sm transition ${
              isEditing ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
            }`}
            data-note-control
            onPointerDown={startResize}
            title="Resize"
            type="button"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </article>
      </div>
    </div>
  );
}
