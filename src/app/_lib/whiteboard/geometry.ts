import type { OpenUIError } from "@openuidev/react-lang";
import { DEFAULT_NOTE_AUTHOR_NAME, type CanvasBoard, type CanvasWidget } from "@/lib/dashboard-schemas";
import {
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  MAX_ZOOM,
  MAX_NOTE_HEIGHT,
  MAX_NOTE_WIDTH,
  MIN_ZOOM,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
  NOTE_BODY_CHAR_WIDTH,
  NOTE_BODY_LINE_HEIGHT,
  NOTE_HORIZONTAL_CHROME,
  NOTE_VERTICAL_CHROME,
  TOP_CANVAS_SAFE_INSET,
  WIDGET_AUTHOR_LABEL_HEIGHT,
  WIDGET_HEADER_HEIGHT,
} from "./constants";
import type { BoardBounds, BoardVisualAccent, ElementSize } from "./types";

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function clampCanvasPoint(point: { x: number; y: number }) {
  return {
    x: Math.min(CANVAS_WIDTH, Math.max(0, point.x)),
    y: Math.min(CANVAS_HEIGHT, Math.max(0, point.y)),
  };
}

export function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

export function hasClosestElement(target: EventTarget | null, selector: string) {
  return target instanceof Element && target.closest(selector) !== null;
}

export function createWidgetId() {
  return globalThis.crypto?.randomUUID?.() ?? `widget-${Date.now()}-${Math.random()}`;
}

export function createBoardId() {
  return globalThis.crypto?.randomUUID?.() ?? `board-${Date.now()}-${Math.random()}`;
}

export function createNoteId() {
  return globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}-${Math.random()}`;
}

export function noteTextSize(title: string, body: string, authorName = DEFAULT_NOTE_AUTHOR_NAME) {
  const bodyLines = body.split("\n");
  const longestText = [title, authorName, ...bodyLines].reduce(
    (current, line) => Math.max(current, line.trim().length),
    0,
  );
  const width = Math.min(
    MAX_NOTE_WIDTH,
    Math.max(DEFAULT_NOTE_WIDTH, NOTE_HORIZONTAL_CHROME + longestText * NOTE_BODY_CHAR_WIDTH),
  );
  const bodyColumnWidth = Math.max(1, width - NOTE_HORIZONTAL_CHROME);
  const bodyCharsPerLine = Math.max(14, Math.floor(bodyColumnWidth / NOTE_BODY_CHAR_WIDTH));
  const wrappedBodyLines = bodyLines.reduce(
    (total, line) => total + Math.max(1, Math.ceil((line.trim().length || 1) / bodyCharsPerLine)),
    0,
  );
  const height = Math.min(
    MAX_NOTE_HEIGHT,
    Math.max(DEFAULT_NOTE_HEIGHT, NOTE_VERTICAL_CHROME + wrappedBodyLines * NOTE_BODY_LINE_HEIGHT),
  );

  return {
    height,
    width,
  };
}

export function boardAccent(boardId: string | undefined): BoardVisualAccent | null {
  if (boardId === "founder") {
    return {
      accent: "var(--board-founder-accent)",
      border: "var(--board-founder-border)",
      canvasMajor: "var(--board-founder-canvas-major)",
      canvasMinor: "var(--board-founder-canvas-minor)",
      surface: "var(--board-founder-surface)",
    };
  }

  if (boardId === "engineering") {
    return {
      accent: "var(--board-engineering-accent)",
      border: "var(--board-engineering-border)",
      canvasMajor: "var(--board-engineering-canvas-major)",
      canvasMinor: "var(--board-engineering-canvas-minor)",
      surface: "var(--board-engineering-surface)",
    };
  }

  if (boardId === "sales") {
    return {
      accent: "var(--board-sales-accent)",
      border: "var(--board-sales-border)",
      canvasMajor: "var(--board-sales-canvas-major)",
      canvasMinor: "var(--board-sales-canvas-minor)",
      surface: "var(--board-sales-surface)",
    };
  }

  if (boardId === "ops") {
    return {
      accent: "var(--board-ops-accent)",
      border: "var(--board-ops-border)",
      canvasMajor: "var(--board-ops-canvas-major)",
      canvasMinor: "var(--board-ops-canvas-minor)",
      surface: "var(--board-ops-surface)",
    };
  }

  return null;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

export function contentFitKey(openuiSource: string, stageSize: ElementSize) {
  return [
    openuiSource.length,
    hashString(openuiSource),
    Math.round(stageSize.width),
    Math.round(stageSize.height),
  ].join(":");
}

export function fittedWidgetHeight(widget: CanvasWidget, stageSize: ElementSize) {
  if (stageSize.width <= 0 || stageSize.height <= 0) {
    return widget.height;
  }

  const targetBodyHeight = (widget.width * stageSize.height) / stageSize.width;
  const targetWidgetHeight = Math.round(WIDGET_HEADER_HEIGHT + targetBodyHeight + WIDGET_AUTHOR_LABEL_HEIGHT);

  return Math.min(CANVAS_HEIGHT - widget.y, Math.max(MIN_WIDGET_HEIGHT, targetWidgetHeight));
}

export function clampCanvasRectPosition(x: number, y: number, width: number, height: number) {
  return {
    x: Math.min(CANVAS_WIDTH - width, Math.max(0, x)),
    y: Math.min(CANVAS_HEIGHT - height, Math.max(0, y)),
  };
}

export function streamErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Widget generation failed.";
}

export function parserErrorKey(errors: OpenUIError[]) {
  return errors.map((error) => `${error.source}:${error.code}:${error.message}`).join("|");
}

export function measuredSize(element: HTMLElement, minimum: ElementSize) {
  return {
    height: Math.max(minimum.height, element.offsetHeight, element.scrollHeight),
    width: Math.max(minimum.width, element.offsetWidth, element.scrollWidth),
  };
}

export function sameSize(left: ElementSize, right: ElementSize) {
  return left.height === right.height && left.width === right.width;
}

export function boardNotes(board: CanvasBoard | undefined) {
  return board?.notes ?? [];
}

export function boardBounds(board: CanvasBoard | undefined): BoardBounds | null {
  const items = board ? [...board.widgets, ...boardNotes(board)] : [];

  if (items.length === 0) {
    return null;
  }

  const bounds = items.reduce(
    (current, item) => ({
      maxX: Math.max(current.maxX, item.x + item.width),
      maxY: Math.max(current.maxY, item.y + item.height),
      minX: Math.min(current.minX, item.x),
      minY: Math.min(current.minY, item.y),
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );

  return {
    ...bounds,
    height: bounds.maxY - bounds.minY,
    width: bounds.maxX - bounds.minX,
  };
}

export function fitZoomForBoard(board: CanvasBoard | undefined, viewport: HTMLElement) {
  const bounds = boardBounds(board);

  if (!board?.templateId || !bounds || bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const availableWidth = Math.max(MIN_WIDGET_WIDTH, viewport.clientWidth - 96);
  const availableHeight = Math.max(MIN_WIDGET_HEIGHT, viewport.clientHeight - TOP_CANVAS_SAFE_INSET - 48);
  const fitZoom = Math.floor(Math.min(1, availableWidth / bounds.width, availableHeight / bounds.height) * 100);

  return clampZoom(fitZoom);
}

export function boardEmoji(boardId: string) {
  if (boardId === "founder") {
    return "🚀";
  }

  if (boardId === "engineering") {
    return "🛠️";
  }

  if (boardId === "sales") {
    return "💼";
  }

  if (boardId === "ops") {
    return "⚙️";
  }

  return "✨";
}

export function canvasCenter() {
  return {
    x: CANVAS_CENTER_X,
    y: CANVAS_CENTER_Y,
  };
}
