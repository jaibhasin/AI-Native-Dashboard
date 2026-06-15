"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CanvasBoard, CanvasNote, CanvasWidget } from "@/lib/dashboard-schemas";

type SetBoards = Dispatch<SetStateAction<CanvasBoard[]>>;

export function useBoardMutations(setBoards: SetBoards) {
  const updateBoardWidgets = useCallback(
    (boardId: string, updater: (widgets: CanvasWidget[]) => CanvasWidget[]) => {
      setBoards((current) =>
        current.map((board) =>
          board.id === boardId
            ? {
                ...board,
                updatedAt: Date.now(),
                widgets: updater(board.widgets),
              }
            : board,
        ),
      );
    },
    [setBoards],
  );

  const updateWidget = useCallback(
    (boardId: string, id: string, updater: (widget: CanvasWidget) => CanvasWidget) => {
      updateBoardWidgets(boardId, (current) =>
        current.map((widget) => (widget.id === id ? updater(widget) : widget)),
      );
    },
    [updateBoardWidgets],
  );

  const updateBoardNotes = useCallback(
    (boardId: string, updater: (notes: CanvasNote[]) => CanvasNote[]) => {
      setBoards((current) =>
        current.map((board) =>
          board.id === boardId
            ? {
                ...board,
                notes: updater(board.notes ?? []),
                updatedAt: Date.now(),
              }
            : board,
        ),
      );
    },
    [setBoards],
  );

  const updateNote = useCallback(
    (boardId: string, id: string, updater: (note: CanvasNote) => CanvasNote) => {
      updateBoardNotes(boardId, (current) =>
        current.map((note) => (note.id === id ? updater(note) : note)),
      );
    },
    [updateBoardNotes],
  );

  const bringWidgetToFront = useCallback(
    (boardId: string, id: string) => {
      setBoards((current) => {
        const boardIndex = current.findIndex((board) => board.id === boardId);

        if (boardIndex === -1) {
          return current;
        }

        const board = current[boardIndex];
        const widgetIndex = board.widgets.findIndex((widget) => widget.id === id);

        if (widgetIndex === -1 || widgetIndex === board.widgets.length - 1) {
          return current;
        }

        const nextWidgets = [...board.widgets];
        const [widget] = nextWidgets.splice(widgetIndex, 1);

        return current.map((currentBoard, index) =>
          index === boardIndex
            ? {
                ...currentBoard,
                updatedAt: Date.now(),
                widgets: [...nextWidgets, widget],
              }
            : currentBoard,
        );
      });
    },
    [setBoards],
  );

  const bringNoteToFront = useCallback(
    (boardId: string, id: string) => {
      setBoards((current) => {
        const boardIndex = current.findIndex((board) => board.id === boardId);

        if (boardIndex === -1) {
          return current;
        }

        const board = current[boardIndex];
        const currentNotes = board.notes ?? [];
        const noteIndex = currentNotes.findIndex((note) => note.id === id);

        if (noteIndex === -1 || noteIndex === currentNotes.length - 1) {
          return current;
        }

        const nextNotes = [...currentNotes];
        const [note] = nextNotes.splice(noteIndex, 1);

        return current.map((currentBoard, index) =>
          index === boardIndex
            ? {
                ...currentBoard,
                notes: [...nextNotes, note],
                updatedAt: Date.now(),
              }
            : currentBoard,
        );
      });
    },
    [setBoards],
  );

  return {
    bringNoteToFront,
    bringWidgetToFront,
    updateBoardNotes,
    updateBoardWidgets,
    updateNote,
    updateWidget,
  };
}
