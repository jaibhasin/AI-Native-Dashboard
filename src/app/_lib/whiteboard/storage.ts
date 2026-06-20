import { z } from "zod/v4";
import {
  BLANK_BOARD_ID,
  BOARD_TEMPLATES,
  BOARD_TEMPLATE_VERSION,
  createBoardFromTemplate,
} from "@/lib/board-templates";
import {
  canvasBoardSchema,
  canvasWidgetSchema,
  type CanvasBoard,
  type CanvasWidget,
} from "@/lib/dashboard-schemas";
import {
  ACTIVE_BOARD_STORAGE_KEY,
  BOARD_STORAGE_KEY,
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y,
  LEGACY_CANVAS_HEIGHT,
  LEGACY_CANVAS_WIDTH,
  LEGACY_WIDGET_STORAGE_KEY,
} from "./constants";

export function migrateLegacyWidgetPosition(widget: CanvasWidget) {
  const isLegacyPosition =
    widget.x >= 0 &&
    widget.x <= LEGACY_CANVAS_WIDTH &&
    widget.y >= 0 &&
    widget.y <= LEGACY_CANVAS_HEIGHT;

  if (!isLegacyPosition) {
    return widget;
  }

  return {
    ...widget,
    x: widget.x + CANVAS_CENTER_X - LEGACY_CANVAS_WIDTH / 2,
    y: widget.y + CANVAS_CENTER_Y - LEGACY_CANVAS_HEIGHT / 2,
  };
}

export function restoreStoredWidget(widget: CanvasWidget) {
  const migratedWidget = migrateLegacyWidgetPosition(widget);

  return migratedWidget.status === "streaming"
    ? {
        ...migratedWidget,
        status: "error" as const,
        error: "Generation was interrupted. Retry this widget to continue.",
      }
    : migratedWidget;
}

export function parseLegacyStoredWidgets() {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(LEGACY_WIDGET_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const widgets = z.array(canvasWidgetSchema).parse(JSON.parse(stored));

    return widgets.map(restoreStoredWidget);
  } catch {
    return [];
  }
}

export function createBlankBoard(widgets: CanvasWidget[] = [], now = Date.now()): CanvasBoard {
  return {
    createdAt: now,
    id: BLANK_BOARD_ID,
    name: "Blank",
    notes: [],
    updatedAt: now,
    widgets,
  };
}

export function ensureBoardSet(boards: CanvasBoard[]) {
  const now = Date.now();
  const boardById = new Map<string, CanvasBoard>();

  boards.forEach((board) => {
    boardById.set(board.id, {
      ...board,
      notes: board.notes ?? [],
      widgets: board.widgets.map(restoreStoredWidget),
    });
  });

  const hasPersonalBoard = [...boardById.values()].some((board) => !board.templateId);

  if (!hasPersonalBoard) {
    boardById.set(BLANK_BOARD_ID, createBlankBoard([], now));
  }

  BOARD_TEMPLATES.forEach((template) => {
    const currentBoard = boardById.get(template.id);

    if (
      !currentBoard ||
      currentBoard.templateId !== template.id ||
      currentBoard.templateVersion !== BOARD_TEMPLATE_VERSION
    ) {
      boardById.set(template.id, createBoardFromTemplate(template, now));
    }
  });

  const orderedIds = [BLANK_BOARD_ID, ...BOARD_TEMPLATES.map((template) => template.id)];
  const orderedBoards = orderedIds
    .map((id) => boardById.get(id))
    .filter((board): board is CanvasBoard => Boolean(board));
  const extraBoards = [...boardById.values()].filter((board) => !orderedIds.includes(board.id));

  return [...orderedBoards, ...extraBoards];
}

export function parseStoredBoards() {
  if (typeof window === "undefined") {
    return ensureBoardSet([createBlankBoard()]);
  }

  const storedBoards = window.localStorage.getItem(BOARD_STORAGE_KEY);

  if (storedBoards) {
    try {
      return ensureBoardSet(z.array(canvasBoardSchema).parse(JSON.parse(storedBoards)));
    } catch {
      return ensureBoardSet([createBlankBoard(parseLegacyStoredWidgets())]);
    }
  }

  return ensureBoardSet([createBlankBoard(parseLegacyStoredWidgets())]);
}

export function storedActiveBoardId(boards: CanvasBoard[]) {
  if (typeof window === "undefined") {
    return BLANK_BOARD_ID;
  }

  const stored = window.localStorage.getItem(ACTIVE_BOARD_STORAGE_KEY);

  if (stored && boards.some((board) => board.id === stored)) {
    return stored;
  }

  return boards.some((board) => board.id === "founder") ? "founder" : boards[0]?.id ?? BLANK_BOARD_ID;
}
