"use client";

import { useCallback, useState, type RefObject } from "react";
import { DEFAULT_NOTE_AUTHOR_NAME, type CanvasNote } from "@/lib/dashboard-schemas";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_NOTE_WIDTH,
} from "@/app/_lib/whiteboard/constants";
import { clampCanvasRectPosition, noteTextSize } from "@/app/_lib/whiteboard/geometry";
import type { NoteFocusTarget } from "@/app/_lib/whiteboard/types";

type UpdateBoardNotes = (boardId: string, updater: (notes: CanvasNote[]) => CanvasNote[]) => void;
type UpdateNote = (boardId: string, id: string, updater: (note: CanvasNote) => CanvasNote) => void;

export function useNoteEditing(
  activeBoardId: string,
  manuallySizedNoteIdsRef: RefObject<Set<string>>,
  updateBoardNotes: UpdateBoardNotes,
  updateNote: UpdateNote,
) {
  const [editingNoteFocus, setEditingNoteFocus] = useState<NoteFocusTarget | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newlyCreatedNoteId, setNewlyCreatedNoteId] = useState<string | null>(null);

  const deleteNote = useCallback(
    (id: string) => {
      updateBoardNotes(activeBoardId, (current) => current.filter((note) => note.id !== id));
      setEditingNoteId((current) => (current === id ? null : current));
      setEditingNoteFocus(null);
      setNewlyCreatedNoteId((current) => (current === id ? null : current));
    },
    [activeBoardId, updateBoardNotes],
  );

  const updateNoteFields = useCallback(
    (id: string, nextNote: Partial<Pick<CanvasNote, "authorName" | "body" | "color" | "height" | "title" | "width">>) => {
      updateNote(activeBoardId, id, (note) => {
        const isManualResize = "width" in nextNote || "height" in nextNote;

        if (isManualResize) {
          manuallySizedNoteIdsRef.current.add(id);
        }

        const resizedFields =
          ("authorName" in nextNote || "body" in nextNote || "title" in nextNote) &&
          !manuallySizedNoteIdsRef.current.has(id)
            ? noteTextSize(
                nextNote.title ?? note.title,
                nextNote.body ?? note.body,
                nextNote.authorName ?? note.authorName ?? DEFAULT_NOTE_AUTHOR_NAME,
              )
            : null;
        const width = Math.min(
          CANVAS_WIDTH - note.x,
          Math.max(DEFAULT_NOTE_WIDTH, nextNote.width ?? resizedFields?.width ?? note.width),
        );
        const height = Math.min(
          CANVAS_HEIGHT - note.y,
          Math.max(DEFAULT_NOTE_HEIGHT, nextNote.height ?? resizedFields?.height ?? note.height),
        );
        const position = clampCanvasRectPosition(note.x, note.y, width, height);

        return {
          ...note,
          ...nextNote,
          height,
          width,
          ...(resizedFields ?? {}),
          ...position,
          updatedAt: Date.now(),
        };
      });
    },
    [activeBoardId, manuallySizedNoteIdsRef, updateNote],
  );

  const editNote = useCallback((id: string, target: NoteFocusTarget) => {
    setEditingNoteId(id);
    setEditingNoteFocus(target);
  }, []);

  const stopEditingNote = useCallback(() => {
    setEditingNoteId(null);
    setEditingNoteFocus(null);
    setNewlyCreatedNoteId(null);
  }, []);

  const handleNoteFocusHandled = useCallback(() => {
    setEditingNoteFocus(null);
  }, []);

  const isNoteManuallySized = useCallback(
    (id: string) => manuallySizedNoteIdsRef.current.has(id),
    [manuallySizedNoteIdsRef],
  );

  return {
    deleteNote,
    editingNoteFocus,
    editingNoteId,
    editNote,
    handleNoteFocusHandled,
    isNoteManuallySized,
    newlyCreatedNoteId,
    setEditingNoteFocus,
    setEditingNoteId,
    setNewlyCreatedNoteId,
    stopEditingNote,
    updateNoteFields,
  };
}
