"use client";

import { Renderer, type OpenUIError } from "@openuidev/react-lang";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Maximize2,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
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
  DEFAULT_NOTE_AUTHOR_NAME,
  type CanvasBoard,
  type CanvasNote,
  type CanvasNoteColor,
  type CanvasWidget,
} from "@/lib/dashboard-schemas";
import type { WidgetStreamEvent } from "@/lib/widget-stream";
import { dashboardRenderLibrary } from "@/openui/dashboard-render-library";

const LEGACY_CANVAS_WIDTH = 3600;
const LEGACY_CANVAS_HEIGHT = 2400;
const CANVAS_WIDTH = 200000;
const CANVAS_HEIGHT = 200000;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;
const GRID_SIZE = 24;
const MAJOR_GRID_SIZE = 120;
const MIN_ZOOM = 20;
const MAX_ZOOM = 200;
const ZOOM_STEP_FACTOR = 1.12;
const ZOOM_SENSITIVITY = 0.0015;
const DEFAULT_WIDGET_WIDTH = 440;
const DEFAULT_WIDGET_HEIGHT = 320;
const DEFAULT_NOTE_WIDTH = 180;
const DEFAULT_NOTE_HEIGHT = 78;
const MAX_NOTE_WIDTH = 440;
const MAX_NOTE_HEIGHT = 320;
const NOTE_HORIZONTAL_CHROME = 36;
const NOTE_VERTICAL_CHROME = 58;
const NOTE_AUTHOR_FOOTER_HEIGHT = 18;
const NOTE_BODY_CHAR_WIDTH = 7;
const NOTE_BODY_LINE_HEIGHT = 20;
const TOP_CANVAS_SAFE_INSET = 180;
const WIDGET_HEADER_HEIGHT = 44;
const WIDGET_AUTHOR_FOOTER_HEIGHT = 18;
const OPENUI_STAGE_WIDTH = DEFAULT_WIDGET_WIDTH;
const OPENUI_STAGE_MIN_HEIGHT = DEFAULT_WIDGET_HEIGHT;
const MIN_WIDGET_WIDTH = 280;
const MIN_WIDGET_HEIGHT = 200;
const LEGACY_WIDGET_STORAGE_KEY = "new-dashboard.canvas.widgets.v1";
const BOARD_STORAGE_KEY = "new-dashboard.canvas.boards.v1";
const ACTIVE_BOARD_STORAGE_KEY = "new-dashboard.canvas.activeBoard.v1";
const THEME_STORAGE_KEY = "new-dashboard.theme.v1";
const BOARD_TAB_SCROLL_EPSILON = 1;

type ThemeMode = "light" | "dark";

type ElementSize = {
  height: number;
  width: number;
};

type BoardBounds = {
  height: number;
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
  width: number;
};

type BoardVisualAccent = {
  accent: string;
  border: string;
  canvasMajor: string;
  canvasMinor: string;
  surface: string;
};

type CommandState = {
  x: number;
  y: number;
  value: string;
};

type NoteFocusTarget = "body" | "title";

type WidgetInteraction =
  | {
      type: "drag";
      id: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      type: "resize";
      id: string;
      startClientX: number;
      startClientY: number;
      startWidth: number;
      startHeight: number;
    }
  | {
      type: "note-drag";
      id: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      type: "note-resize";
      id: string;
      startClientX: number;
      startClientY: number;
      startWidth: number;
      startHeight: number;
    };

type PendingZoomScroll = {
  anchorX: number;
  anchorY: number;
  worldX: number;
  worldY: number;
};

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function clampCanvasPoint(point: { x: number; y: number }) {
  return {
    x: Math.min(CANVAS_WIDTH, Math.max(0, point.x)),
    y: Math.min(CANVAS_HEIGHT, Math.max(0, point.y)),
  };
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

function hasClosestElement(target: EventTarget | null, selector: string) {
  return target instanceof Element && target.closest(selector) !== null;
}

function createWidgetId() {
  return globalThis.crypto?.randomUUID?.() ?? `widget-${Date.now()}-${Math.random()}`;
}

function createBoardId() {
  return globalThis.crypto?.randomUUID?.() ?? `board-${Date.now()}-${Math.random()}`;
}

function createNoteId() {
  return globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}-${Math.random()}`;
}

function noteTextSize(title: string, body: string, authorName = DEFAULT_NOTE_AUTHOR_NAME) {
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

function boardAccent(boardId: string | undefined): BoardVisualAccent | null {
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

const noteColorStyles: Record<
  CanvasNoteColor,
  {
    accent: string;
    background: string;
    border: string;
    shadow: string;
  }
> = {
  amber: {
    accent: "var(--note-amber-accent)",
    background: "var(--note-amber-bg)",
    border: "var(--note-amber-border)",
    shadow: "var(--note-amber-shadow)",
  },
  blue: {
    accent: "var(--note-blue-accent)",
    background: "var(--note-blue-bg)",
    border: "var(--note-blue-border)",
    shadow: "var(--note-blue-shadow)",
  },
  green: {
    accent: "var(--note-green-accent)",
    background: "var(--note-green-bg)",
    border: "var(--note-green-border)",
    shadow: "var(--note-green-shadow)",
  },
  rose: {
    accent: "var(--note-rose-accent)",
    background: "var(--note-rose-bg)",
    border: "var(--note-rose-border)",
    shadow: "var(--note-rose-shadow)",
  },
};

const noteColorOptions: CanvasNoteColor[] = ["blue", "green", "amber", "rose"];
const noteColorLabels: Record<CanvasNoteColor, string> = {
  amber: "amber",
  blue: "blue",
  green: "green",
  rose: "neutral",
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function contentFitKey(openuiSource: string, stageSize: ElementSize) {
  return [
    openuiSource.length,
    hashString(openuiSource),
    Math.round(stageSize.width),
    Math.round(stageSize.height),
  ].join(":");
}

function fittedWidgetHeight(widget: CanvasWidget, stageSize: ElementSize) {
  if (stageSize.width <= 0 || stageSize.height <= 0) {
    return widget.height;
  }

  const targetBodyHeight = (widget.width * stageSize.height) / stageSize.width;
  const targetWidgetHeight = Math.round(WIDGET_HEADER_HEIGHT + targetBodyHeight + WIDGET_AUTHOR_FOOTER_HEIGHT);

  return Math.min(CANVAS_HEIGHT - widget.y, Math.max(MIN_WIDGET_HEIGHT, targetWidgetHeight));
}

function clampCanvasRectPosition(x: number, y: number, width: number, height: number) {
  return {
    x: Math.min(CANVAS_WIDTH - width, Math.max(0, x)),
    y: Math.min(CANVAS_HEIGHT - height, Math.max(0, y)),
  };
}

function migrateLegacyWidgetPosition(widget: CanvasWidget) {
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

function restoreStoredWidget(widget: CanvasWidget) {
  const migratedWidget = migrateLegacyWidgetPosition(widget);

  return migratedWidget.status === "streaming"
    ? {
        ...migratedWidget,
        status: "error" as const,
        error: "Generation was interrupted. Retry this widget to continue.",
      }
    : migratedWidget;
}

function parseLegacyStoredWidgets() {
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

function createBlankBoard(widgets: CanvasWidget[] = [], now = Date.now()): CanvasBoard {
  return {
    createdAt: now,
    id: BLANK_BOARD_ID,
    name: "Blank",
    notes: [],
    updatedAt: now,
    widgets,
  };
}

function ensureBoardSet(boards: CanvasBoard[]) {
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

function parseStoredBoards() {
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

function storedActiveBoardId(boards: CanvasBoard[]) {
  if (typeof window === "undefined") {
    return BLANK_BOARD_ID;
  }

  const stored = window.localStorage.getItem(ACTIVE_BOARD_STORAGE_KEY);

  return boards.some((board) => board.id === stored)
    ? stored ?? boards[0]?.id ?? BLANK_BOARD_ID
    : boards[0]?.id ?? BLANK_BOARD_ID;
}

function preferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function streamErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Widget generation failed.";
}

function parserErrorKey(errors: OpenUIError[]) {
  return errors.map((error) => `${error.source}:${error.code}:${error.message}`).join("|");
}

function measuredSize(element: HTMLElement, minimum: ElementSize) {
  return {
    height: Math.max(minimum.height, element.offsetHeight, element.scrollHeight),
    width: Math.max(minimum.width, element.offsetWidth, element.scrollWidth),
  };
}

function sameSize(left: ElementSize, right: ElementSize) {
  return left.height === right.height && left.width === right.width;
}

function boardNotes(board: CanvasBoard | undefined) {
  return board?.notes ?? [];
}

function boardBounds(board: CanvasBoard | undefined): BoardBounds | null {
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

function fitZoomForBoard(board: CanvasBoard | undefined, viewport: HTMLElement) {
  const bounds = boardBounds(board);

  if (!board?.templateId || !bounds || bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const availableWidth = Math.max(MIN_WIDGET_WIDTH, viewport.clientWidth - 96);
  const availableHeight = Math.max(MIN_WIDGET_HEIGHT, viewport.clientHeight - TOP_CANVAS_SAFE_INSET - 48);
  const fitZoom = Math.floor(Math.min(1, availableWidth / bounds.width, availableHeight / bounds.height) * 100);

  return clampZoom(fitZoom);
}

function boardEmoji(boardId: string) {
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

function StreamingSkeleton({ widget }: { widget: CanvasWidget }) {
  return (
    <div className="h-full bg-[var(--surface)] p-4">
      <div className="mb-4">
        <div className="h-4 w-44 animate-pulse rounded bg-[var(--border)]" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded bg-[var(--surface-subtle)]" />
      </div>
      {widget.exampleData ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {widget.exampleData.metrics.slice(0, 4).map((metric, index) => (
              <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-3" key={`${metric.label}-${index}`}>
                <div className="truncate text-[11px] font-medium uppercase text-[var(--text-muted)]">{metric.label}</div>
                <div className="mt-1 truncate text-xl font-semibold text-[var(--text-primary)]">{metric.value}</div>
              </div>
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-md border border-[var(--border)] bg-[var(--panel)]" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="h-20 animate-pulse rounded-md bg-[var(--surface-subtle)]" />
            <div className="h-20 animate-pulse rounded-md bg-[var(--surface-subtle)]" />
          </div>
          <div className="h-32 animate-pulse rounded-md bg-[var(--surface-subtle)]" />
        </div>
      )}
      <div className="mt-4 text-xs font-medium text-[var(--text-muted)]">
        {widget.exampleData ? "Composing widget UI..." : "Generating preview data..."}
      </div>
    </div>
  );
}

const WidgetBody = memo(function WidgetBody({
  alignContentToTop = false,
  onContentMeasured,
  widget,
}: {
  alignContentToTop?: boolean;
  onContentMeasured: (id: string, openuiSource: string, stageSize: ElementSize) => void;
  widget: CanvasWidget;
}) {
  const [renderErrors, setRenderErrors] = useState<OpenUIError[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [bodySize, setBodySize] = useState<ElementSize>({ height: 0, width: 0 });
  const [stageSize, setStageSize] = useState<ElementSize>({
    height: OPENUI_STAGE_MIN_HEIGHT,
    width: OPENUI_STAGE_WIDTH,
  });
  const [measuredStageSource, setMeasuredStageSource] = useState("");

  useLayoutEffect(() => {
    const bodyElement = bodyRef.current;
    const stageElement = stageRef.current;

    if (!bodyElement || !stageElement) {
      return;
    }

    const updateSizes = () => {
      const nextBodySize = {
        height: bodyElement.clientHeight,
        width: bodyElement.clientWidth,
      };
      const nextStageSize = measuredSize(stageElement, {
        height: OPENUI_STAGE_MIN_HEIGHT,
        width: OPENUI_STAGE_WIDTH,
      });

      setBodySize((current) => (sameSize(current, nextBodySize) ? current : nextBodySize));
      setStageSize((current) => (sameSize(current, nextStageSize) ? current : nextStageSize));
      setMeasuredStageSource(widget.openuiSource);
    };

    updateSizes();

    if (typeof ResizeObserver === "undefined") {
      const frame = requestAnimationFrame(updateSizes);

      return () => cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserver(updateSizes);
    observer.observe(bodyElement);
    observer.observe(stageElement);

    const frame = requestAnimationFrame(updateSizes);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [widget.openuiSource]);

  useEffect(() => {
    if (measuredStageSource !== widget.openuiSource || widget.status !== "done" || !widget.openuiSource) {
      return;
    }

    onContentMeasured(widget.id, widget.openuiSource, stageSize);
  }, [measuredStageSource, onContentMeasured, stageSize, widget.id, widget.openuiSource, widget.status]);

  if (widget.status === "error") {
    return (
      <div className="grid h-full place-items-center bg-[var(--surface)] p-5 text-center">
        <div className="max-w-[18rem]">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Generation failed</div>
          <div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{widget.error}</div>
        </div>
      </div>
    );
  }

  if (!widget.openuiSource) {
    return <StreamingSkeleton widget={widget} />;
  }

  const contentScale =
    bodySize.width > 0 && bodySize.height > 0
      ? Math.min(bodySize.width / stageSize.width, bodySize.height / stageSize.height)
      : 1;

  return (
    <div
      ref={bodyRef}
      className={`relative grid h-full overflow-hidden bg-[var(--surface)] ${
        alignContentToTop ? "items-start justify-items-center" : "place-items-center"
      }`}
      data-openui-fit-body
    >
      <div
        className="relative"
        data-openui-fit-shell
        style={{
          height: stageSize.height * contentScale,
          width: stageSize.width * contentScale,
        }}
      >
        <div
          ref={stageRef}
          data-openui-fit-stage
          style={{
            minHeight: OPENUI_STAGE_MIN_HEIGHT,
            transform: `scale(${contentScale})`,
            transformOrigin: "top left",
            width: OPENUI_STAGE_WIDTH,
          }}
        >
          <Renderer
            isStreaming={widget.status === "streaming"}
            library={dashboardRenderLibrary}
            onError={(errors) => {
              setRenderErrors((current) =>
                parserErrorKey(current) === parserErrorKey(errors) ? current : errors,
              );
            }}
            response={widget.openuiSource}
          />
        </div>
      </div>
      {renderErrors.length ? (
        <div className="absolute bottom-2 left-2 right-2 rounded border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2 py-1 text-[11px] font-medium text-[var(--warning-text)] shadow-sm">
          Some generated UI was ignored: {renderErrors[0]?.message}
        </div>
      ) : null}
    </div>
  );
});

function NoteFrame({
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
  const noteSurfaceHeight = Math.max(0, note.height - NOTE_AUTHOR_FOOTER_HEIGHT);

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
        style={{
          height: note.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: note.width,
        }}
      >
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

          <div className="min-h-0 flex-1 p-1.5">
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
                className={`block h-full w-full rounded px-1 py-0.5 text-left text-[12px] font-medium leading-5 transition hover:bg-white/45 ${
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
        <div className="mt-1 truncate px-1 text-[10px] font-medium leading-3 text-[var(--text-muted)]">
          {displayAuthor}
        </div>
      </div>
    </div>
  );
}

function WidgetFrame({
  accent,
  onBringToFront,
  onDelete,
  onContentMeasured,
  onRetry,
  onStartInteraction,
  scale,
  widget,
}: {
  accent: BoardVisualAccent | null;
  onBringToFront: (id: string) => void;
  onDelete: (id: string) => void;
  onContentMeasured: (id: string, openuiSource: string, stageSize: ElementSize) => void;
  onRetry: (widget: CanvasWidget) => void;
  onStartInteraction: (event: PointerEvent<HTMLElement>, interaction: WidgetInteraction) => void;
  scale: number;
  widget: CanvasWidget;
}) {
  const title = widget.exampleData?.title || widget.prompt;
  const displayAuthor = widget.authorName.trim() || DEFAULT_NOTE_AUTHOR_NAME;
  const widgetSurfaceHeight = Math.max(MIN_WIDGET_HEIGHT - WIDGET_AUTHOR_FOOTER_HEIGHT, widget.height - WIDGET_AUTHOR_FOOTER_HEIGHT);
  const statusLabel =
    widget.status === "streaming" ? "Generating" : widget.status === "error" ? "Error" : "Preview";

  return (
    <div
      className="absolute z-10"
      data-widget
      onPointerDownCapture={(event) => {
        if (event.button === 0) {
          onBringToFront(widget.id);
        }
      }}
      style={{
        height: widget.height * scale,
        left: widget.x * scale,
        top: widget.y * scale,
        width: widget.width * scale,
      }}
    >
      <div
        style={{
          height: widget.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          willChange: "transform",
          width: widget.width,
        }}
      >
      <article
        className="group relative flex overflow-hidden rounded-md border bg-[var(--panel)]"
        style={{
          borderColor: "var(--border-medium)",
          boxShadow: "var(--shadow-widget)",
          height: widgetSurfaceHeight,
          width: widget.width,
        }}
      >
        <div className="flex min-h-0 w-full flex-col">
          <header
            className="flex h-11 shrink-0 cursor-grab items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-2.5 active:cursor-grabbing"
            onPointerDown={(event) => {
              if (hasClosestElement(event.target, "[data-widget-control]")) {
                return;
              }

              onStartInteraction(event, {
                id: widget.id,
                startClientX: event.clientX,
                startClientY: event.clientY,
                startX: widget.x,
                startY: widget.y,
                type: "drag",
              });
            }}
            style={{
              background: accent ? `linear-gradient(90deg, ${accent.surface}, var(--panel) 62%)` : undefined,
              borderColor: "var(--border)",
            }}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</div>
              <div className="truncate text-[11px] text-[var(--text-muted)]">{widget.prompt}</div>
            </div>
            <span className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
              {statusLabel}
            </span>
            {widget.status === "error" ? (
              <button
                aria-label="Retry widget"
                className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)]"
                data-widget-control
                onClick={(event) => {
                  event.stopPropagation();
                  onRetry(widget);
                }}
                title="Retry"
                type="button"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button
              aria-label="Delete widget"
              className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] opacity-0 transition hover:bg-[var(--control-hover)] focus:opacity-100 group-hover:opacity-100"
              data-widget-control
              onClick={(event) => {
                event.stopPropagation();
                onDelete(widget.id);
              }}
              title="Delete"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden">
            <WidgetBody
              alignContentToTop={Boolean(accent)}
              onContentMeasured={onContentMeasured}
              widget={widget}
            />
          </div>

          <button
            aria-label="Resize widget"
            className="pointer-events-none absolute bottom-1.5 right-1.5 grid h-6 w-6 cursor-nwse-resize place-items-center rounded border border-[var(--border-strong)] bg-[var(--panel-translucent-strong)] text-[var(--text-muted)] opacity-0 shadow-sm transition group-hover:pointer-events-auto group-hover:opacity-100"
            data-widget-control
            onPointerDown={(event) =>
              onStartInteraction(event, {
                id: widget.id,
                startClientX: event.clientX,
                startClientY: event.clientY,
                startHeight: widget.height,
                startWidth: widget.width,
                type: "resize",
              })
            }
            title="Resize"
            type="button"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>
        <div className="mt-1 truncate px-1 text-[10px] font-medium leading-3 text-[var(--text-muted)]">
          {displayAuthor}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardTabsScrollRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const boardNameInputRef = useRef<HTMLInputElement>(null);
  const zoomRef = useRef(100);
  const cursorRef = useRef({
    inside: false,
    x: CANVAS_CENTER_X,
    y: CANVAS_CENTER_Y,
  });
  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const widgetInteractionRef = useRef<WidgetInteraction | null>(null);
  const pendingZoomScrollRef = useRef<PendingZoomScroll | null>(null);
  const hasScrolledHydratedBoardRef = useRef(false);
  const manuallySizedNoteIdsRef = useRef<Set<string>>(new Set());

  const [zoom, setZoom] = useState(100);
  const [isPanning, setIsPanning] = useState(false);
  const [command, setCommand] = useState<CommandState | null>(null);
  const [boards, setBoards] = useState<CanvasBoard[]>(() => ensureBoardSet([createBlankBoard()]));
  const [activeBoardId, setActiveBoardId] = useState(BLANK_BOARD_ID);
  const [editingNoteFocus, setEditingNoteFocus] = useState<NoteFocusTarget | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newlyCreatedNoteId, setNewlyCreatedNoteId] = useState<string | null>(null);
  const [isCreatingBoardName, setIsCreatingBoardName] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState("");
  const [hasHydratedBoards, setHasHydratedBoards] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [hasHydratedTheme, setHasHydratedTheme] = useState(false);
  const [boardTabsScrollState, setBoardTabsScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    hasOverflow: false,
  });

  const scale = zoom / 100;
  const commandPosition = command ? `${command.x}:${command.y}` : null;
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0];
  const activeBoardIsTemplate = Boolean(activeBoard?.templateId);
  const widgets = activeBoard?.widgets ?? [];
  const notes = boardNotes(activeBoard);
  const activeBoardAccent = useMemo(() => boardAccent(activeBoard?.templateId), [activeBoard?.templateId]);
  const personalBoards = boards.filter((board) => !board.templateId);
  const prebuiltBoards = boards.filter((board) => board.templateId);
  const totalBoardCount = prebuiltBoards.length + personalBoards.length;
  const canZoomOut = zoom > MIN_ZOOM;
  const canZoomIn = zoom < MAX_ZOOM;
  const nextTheme = theme === "dark" ? "light" : "dark";

  const updateBoardTabsScrollState = useCallback(() => {
    const scrollport = boardTabsScrollRef.current;

    if (!scrollport) {
      setBoardTabsScrollState((current) =>
        current.canScrollLeft || current.canScrollRight || current.hasOverflow
          ? {
              canScrollLeft: false,
              canScrollRight: false,
              hasOverflow: false,
            }
          : current,
      );
      return;
    }

    const maxScrollLeft = Math.max(0, scrollport.scrollWidth - scrollport.clientWidth);
    const hasOverflow = maxScrollLeft > BOARD_TAB_SCROLL_EPSILON;
    const nextState = {
      canScrollLeft: hasOverflow && scrollport.scrollLeft > BOARD_TAB_SCROLL_EPSILON,
      canScrollRight: hasOverflow && scrollport.scrollLeft < maxScrollLeft - BOARD_TAB_SCROLL_EPSILON,
      hasOverflow,
    };

    setBoardTabsScrollState((current) =>
      current.canScrollLeft === nextState.canScrollLeft &&
      current.canScrollRight === nextState.canScrollRight &&
      current.hasOverflow === nextState.hasOverflow
        ? current
        : nextState,
    );
  }, []);

  const scrollBoardTabIntoView = useCallback(
    (boardId: string) => {
      const scrollport = boardTabsScrollRef.current;

      if (!scrollport) {
        return;
      }

      const activeTab = Array.from(scrollport.querySelectorAll<HTMLElement>("[data-board-tab-id]")).find(
        (element) => element.dataset.boardTabId === boardId,
      );

      activeTab?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
      requestAnimationFrame(updateBoardTabsScrollState);
    },
    [updateBoardTabsScrollState],
  );

  const scrollBoardTabs = useCallback(
    (direction: "left" | "right") => {
      const scrollport = boardTabsScrollRef.current;

      if (!scrollport) {
        return;
      }

      scrollport.scrollBy({
        behavior: "smooth",
        left: (direction === "left" ? -1 : 1) * Math.max(120, Math.floor(scrollport.clientWidth * 0.7)),
      });
      requestAnimationFrame(updateBoardTabsScrollState);
    },
    [updateBoardTabsScrollState],
  );

  const updateBoardWidgets = useCallback((boardId: string, updater: (widgets: CanvasWidget[]) => CanvasWidget[]) => {
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
  }, []);

  const updateWidget = useCallback(
    (boardId: string, id: string, updater: (widget: CanvasWidget) => CanvasWidget) => {
      updateBoardWidgets(boardId, (current) =>
        current.map((widget) => (widget.id === id ? updater(widget) : widget)),
      );
    },
    [updateBoardWidgets],
  );

  const updateBoardNotes = useCallback((boardId: string, updater: (notes: CanvasNote[]) => CanvasNote[]) => {
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
  }, []);

  const updateNote = useCallback(
    (boardId: string, id: string, updater: (note: CanvasNote) => CanvasNote) => {
      updateBoardNotes(boardId, (current) =>
        current.map((note) => (note.id === id ? updater(note) : note)),
      );
    },
    [updateBoardNotes],
  );

  const bringWidgetToFront = useCallback((boardId: string, id: string) => {
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
  }, []);

  const bringNoteToFront = useCallback((boardId: string, id: string) => {
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
  }, []);

  const deleteWidget = useCallback(
    (id: string) => {
      updateBoardWidgets(activeBoardId, (current) => current.filter((widget) => widget.id !== id));
    },
    [activeBoardId, updateBoardWidgets],
  );

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
                nextNote.authorName ?? note.authorName,
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
    [activeBoardId, updateNote],
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

  const scrollToBoard = useCallback(
    (board: CanvasBoard | undefined, scaleOverride = scale, topInset = TOP_CANVAS_SAFE_INSET) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const bounds = boardBounds(board);

      if (!bounds) {
        viewport.scrollLeft = CANVAS_CENTER_X * scaleOverride - viewport.clientWidth / 2;
        viewport.scrollTop = CANVAS_CENTER_Y * scaleOverride - viewport.clientHeight / 2 - topInset;
        return;
      }

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      viewport.scrollLeft = centerX * scaleOverride - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * scaleOverride - viewport.clientHeight / 2 - topInset;
    },
    [scale],
  );

  const focusBoard = useCallback(
    (board: CanvasBoard | undefined) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const nextZoom = fitZoomForBoard(board, viewport);
      pendingZoomScrollRef.current = null;

      if (nextZoom) {
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        scrollToBoard(board, nextZoom / 100, TOP_CANVAS_SAFE_INSET / 2);
        return;
      }

      scrollToBoard(board);
    },
    [scrollToBoard],
  );

  const deleteBoard = useCallback(
    (boardId: string) => {
      const personalBoardsAfterDelete = boards.filter((board) => !board.templateId && board.id !== boardId);
      const fallbackBoard = personalBoardsAfterDelete[0] ?? boards.find((board) => board.id !== boardId);

      setBoards((current) => {
        const boardToDelete = current.find((board) => board.id === boardId);
        const personalBoardCount = current.filter((board) => !board.templateId).length;

        if (!boardToDelete || boardToDelete.templateId || personalBoardCount <= 1) {
          return current;
        }

        return current.filter((board) => board.id !== boardId);
      });

      if (activeBoardId === boardId) {
        setActiveBoardId(fallbackBoard?.id ?? BLANK_BOARD_ID);
        setCommand(null);
        stopEditingNote();
        requestAnimationFrame(() => focusBoard(fallbackBoard));
      }
    },
    [activeBoardId, boards, focusBoard, stopEditingNote],
  );

  const selectBoard = useCallback(
    (boardId: string) => {
      setActiveBoardId(boardId);
      setIsCreatingBoardName(false);
      setBoardNameDraft("");
      setCommand(null);
      stopEditingNote();

      requestAnimationFrame(() => {
        focusBoard(boards.find((board) => board.id === boardId));
      });
    },
    [boards, focusBoard, stopEditingNote],
  );

  const openBoardNameCreate = useCallback(() => {
    setIsCreatingBoardName(true);
    setBoardNameDraft("");
    setCommand(null);
    stopEditingNote();
  }, [stopEditingNote]);

  const cancelBoardNameCreate = useCallback(() => {
    setIsCreatingBoardName(false);
    setBoardNameDraft("");
  }, []);

  const createNamedBlankBoard = useCallback(() => {
    const nextName = boardNameDraft.trim().slice(0, 48);

    if (!nextName) {
      return;
    }

    const now = Date.now();
    const board: CanvasBoard = {
      createdAt: now,
      id: createBoardId(),
      name: nextName,
      notes: [],
      updatedAt: now,
      widgets: [],
    };

    setBoards((current) => [...current, board]);
    setActiveBoardId(board.id);
    setIsCreatingBoardName(false);
    setBoardNameDraft("");
    setCommand(null);
    stopEditingNote();

    requestAnimationFrame(() => focusBoard(board));
  }, [boardNameDraft, focusBoard, stopEditingNote]);

  const addWidgetToBoard = useCallback(
    (boardId: string, widget: CanvasWidget) => {
      updateBoardWidgets(boardId, (current) => [...current, widget]);
    },
    [updateBoardWidgets],
  );

  const fitWidgetToContent = useCallback(
    (id: string, openuiSource: string, stageSize: ElementSize) => {
      if (activeBoardIsTemplate) {
        return;
      }

      const nextContentFitKey = contentFitKey(openuiSource, stageSize);

      updateWidget(activeBoardId, id, (widget) => {
        if (
          widget.status !== "done" ||
          widget.openuiSource !== openuiSource ||
          widget.contentFitKey === nextContentFitKey
        ) {
          return widget;
        }

        return {
          ...widget,
          contentFitKey: nextContentFitKey,
          height: fittedWidgetHeight(widget, stageSize),
          updatedAt: Date.now(),
        };
      });
    },
    [activeBoardId, activeBoardIsTemplate, updateWidget],
  );

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(updateBoardTabsScrollState);
    const scrollport = boardTabsScrollRef.current;

    if (!scrollport) {
      return () => cancelAnimationFrame(frame);
    }

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateBoardTabsScrollState);

    resizeObserver?.observe(scrollport);
    window.addEventListener("resize", updateBoardTabsScrollState);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateBoardTabsScrollState);
    };
  }, [isCreatingBoardName, totalBoardCount, updateBoardTabsScrollState]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollBoardTabIntoView(activeBoardId));

    return () => cancelAnimationFrame(frame);
  }, [activeBoardId, scrollBoardTabIntoView, totalBoardCount]);

  useEffect(() => {
    const storedBoards = parseStoredBoards();

    setBoards(storedBoards);
    setActiveBoardId(storedActiveBoardId(storedBoards));
    setHasHydratedBoards(true);
  }, []);

  useEffect(() => {
    setTheme(preferredTheme());
    setHasHydratedTheme(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedTheme) {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [hasHydratedTheme, theme]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const viewport = viewportRef.current;

      if (!viewport || viewport.scrollLeft !== 0 || viewport.scrollTop !== 0) {
        return;
      }

      viewport.scrollLeft = CANVAS_CENTER_X - viewport.clientWidth / 2;
      viewport.scrollTop = CANVAS_CENTER_Y - viewport.clientHeight / 2 - TOP_CANVAS_SAFE_INSET;
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hasHydratedBoards || hasScrolledHydratedBoardRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      focusBoard(activeBoard);
      hasScrolledHydratedBoardRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [activeBoard, focusBoard, hasHydratedBoards]);

  useEffect(() => {
    if (!hasHydratedBoards) {
      return;
    }

    const activeNoteIds = new Set(boards.flatMap((board) => board.notes ?? []).map((note) => note.id));
    const manualIds = manuallySizedNoteIdsRef.current;

    manualIds.forEach((id) => {
      if (!activeNoteIds.has(id)) {
        manualIds.delete(id);
      }
    });

    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(boards));
    window.localStorage.setItem(ACTIVE_BOARD_STORAGE_KEY, activeBoardId);
  }, [activeBoardId, boards, hasHydratedBoards]);

  useEffect(() => {
    if (!editingNoteId) {
      return;
    }

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (hasClosestElement(event.target, "[data-note]")) {
        return;
      }

      stopEditingNote();
    };

    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [editingNoteId, stopEditingNote]);

  const updateCursorPosition = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const x = (viewport.scrollLeft + event.clientX - rect.left) / scale;
      const y = (viewport.scrollTop + event.clientY - rect.top) / scale;

      cursorRef.current = {
        inside: true,
        ...clampCanvasPoint({ x, y }),
      };
    },
    [scale],
  );

  const getVisibleCanvasCenter = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return {
        x: CANVAS_CENTER_X,
        y: CANVAS_CENTER_Y,
      };
    }

    return clampCanvasPoint({
      x: (viewport.scrollLeft + viewport.clientWidth / 2) / scale,
      y: (viewport.scrollTop + viewport.clientHeight / 2) / scale,
    });
  }, [scale]);

  const addNoteToActiveBoard = useCallback((targetPosition?: { x: number; y: number }) => {
    if (!activeBoard) {
      return;
    }

    const now = Date.now();
    const bounds = boardBounds(activeBoard);
    const currentNotes = activeBoard.notes ?? [];
    const fallbackCenter = getVisibleCanvasCenter();
    const noteSize = noteTextSize("", "", DEFAULT_NOTE_AUTHOR_NAME);
    const basePosition =
      targetPosition ??
      (bounds
        ? {
            x: bounds.maxX + 28,
            y: bounds.minY + (currentNotes.length % 4) * (DEFAULT_NOTE_HEIGHT + 18),
          }
        : {
            x: fallbackCenter.x - DEFAULT_NOTE_WIDTH / 2,
            y: fallbackCenter.y - DEFAULT_NOTE_HEIGHT / 2,
          });
    const position = clampCanvasRectPosition(basePosition.x, basePosition.y, noteSize.width, noteSize.height);
    const id = createNoteId();
    const note: CanvasNote = {
      authorName: DEFAULT_NOTE_AUTHOR_NAME,
      body: "",
      color: noteColorOptions[currentNotes.length % noteColorOptions.length],
      createdAt: now,
      height: noteSize.height,
      id,
      title: "",
      updatedAt: now,
      width: noteSize.width,
      ...position,
    };

    updateBoardNotes(activeBoard.id, (current) => [...current, note]);
    setCommand(null);
    setEditingNoteId(id);
    setEditingNoteFocus("body");
    setNewlyCreatedNoteId(id);

    if (!targetPosition) {
      requestAnimationFrame(() => focusBoard({ ...activeBoard, notes: [...currentNotes, note], updatedAt: now }));
    }
  }, [activeBoard, focusBoard, getVisibleCanvasCenter, updateBoardNotes]);

  const addNoteAtCursor = useCallback(() => {
    const cursor = cursorRef.current;
    const visibleCenter = getVisibleCanvasCenter();
    const position = cursor.inside
      ? {
          x: cursor.x,
          y: cursor.y,
        }
      : {
          x: visibleCenter.x - DEFAULT_NOTE_WIDTH / 2,
          y: visibleCenter.y - DEFAULT_NOTE_HEIGHT / 2,
        };

    addNoteToActiveBoard(position);
  }, [addNoteToActiveBoard, getVisibleCanvasCenter]);

  const openCommandAtCursor = useCallback(() => {
    const cursor = cursorRef.current;
    const position = cursor.inside
      ? clampCanvasPoint({
          x: cursor.x,
          y: cursor.y,
        })
      : getVisibleCanvasCenter();

    stopEditingNote();
    setCommand({
      x: position.x,
      y: position.y,
      value: "",
    });
  }, [getVisibleCanvasCenter, stopEditingNote]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        if (editingNoteId) {
          event.preventDefault();
          stopEditingNote();
          return;
        }

        if (command) {
          event.preventDefault();
          setCommand(null);
        }
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        openCommandAtCursor();
        return;
      }

      if (
        !event.repeat &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === "n"
      ) {
        event.preventDefault();
        addNoteAtCursor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [addNoteAtCursor, command, editingNoteId, openCommandAtCursor, stopEditingNote]);

  useEffect(() => {
    if (!commandPosition) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      commandInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [commandPosition]);

  useEffect(() => {
    if (!isCreatingBoardName) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      boardNameInputRef.current?.focus();
      boardNameInputRef.current?.select();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isCreatingBoardName]);

  const setCanvasZoom = useCallback(
    (nextValue: number, anchor?: { x: number; y: number }) => {
      const nextZoom = clampZoom(nextValue);
      const viewport = viewportRef.current;
      const currentZoom = zoomRef.current;

      if (!viewport || nextZoom === currentZoom) {
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        return;
      }

      const currentScale = currentZoom / 100;
      const anchorX = anchor?.x ?? viewport.clientWidth / 2;
      const anchorY = anchor?.y ?? viewport.clientHeight / 2;
      const pendingScroll = pendingZoomScrollRef.current;
      const effectiveScrollLeft = pendingScroll
        ? pendingScroll.worldX * currentScale - pendingScroll.anchorX
        : viewport.scrollLeft;
      const effectiveScrollTop = pendingScroll
        ? pendingScroll.worldY * currentScale - pendingScroll.anchorY
        : viewport.scrollTop;
      const worldX = (effectiveScrollLeft + anchorX) / currentScale;
      const worldY = (effectiveScrollTop + anchorY) / currentScale;

      zoomRef.current = nextZoom;
      pendingZoomScrollRef.current = {
        anchorX,
        anchorY,
        worldX,
        worldY,
      };
      setZoom(nextZoom);
    },
    [],
  );

  useLayoutEffect(() => {
    const pendingScroll = pendingZoomScrollRef.current;
    const viewport = viewportRef.current;

    if (!pendingScroll || !viewport) {
      return;
    }

    const nextScale = zoom / 100;

    viewport.scrollLeft = pendingScroll.worldX * nextScale - pendingScroll.anchorX;
    viewport.scrollTop = pendingScroll.worldY * nextScale - pendingScroll.anchorY;
    pendingZoomScrollRef.current = null;
  }, [zoom]);

  const adjustZoom = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;
      const anchor = viewport
        ? {
            x: viewport.clientWidth / 2,
            y: viewport.clientHeight / 2,
          }
        : undefined;

      setCanvasZoom(zoomRef.current * factor, anchor);
    },
    [setCanvasZoom],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "=" || event.key === "+" || event.key === "Add" || event.code === "NumpadAdd") {
        event.preventDefault();
        adjustZoom(ZOOM_STEP_FACTOR);
        return;
      }

      if (event.key === "-" || event.key === "_" || event.code === "Subtract" || event.code === "NumpadSubtract") {
        event.preventDefault();
        adjustZoom(1 / ZOOM_STEP_FACTOR);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [adjustZoom]);

  const canvasStyle = useMemo<CSSProperties>(() => {
    const minorLine = activeBoardAccent?.canvasMinor ?? "var(--canvas-grid-minor)";
    const majorLine = activeBoardAccent?.canvasMajor ?? "var(--canvas-grid-major)";

    return {
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale,
      backgroundColor: activeBoardAccent ? "var(--canvas-tinted-bg)" : "var(--canvas-bg)",
      backgroundImage:
        `linear-gradient(${minorLine} 1px, transparent 1px), linear-gradient(90deg, ${minorLine} 1px, transparent 1px), linear-gradient(${majorLine} 1px, transparent 1px), linear-gradient(90deg, ${majorLine} 1px, transparent 1px)`,
      backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px, ${GRID_SIZE * scale}px ${GRID_SIZE * scale}px, ${MAJOR_GRID_SIZE * scale}px ${MAJOR_GRID_SIZE * scale}px, ${MAJOR_GRID_SIZE * scale}px ${MAJOR_GRID_SIZE * scale}px`,
      backgroundPosition: "-1px -1px",
    };
  }, [activeBoardAccent, scale]);

  const handleStreamEvent = useCallback(
    (boardId: string, id: string, event: WidgetStreamEvent) => {
      const now = Date.now();

      if (event.type === "exampleData") {
        updateWidget(boardId, id, (widget) => ({
          ...widget,
          exampleData: event.data,
          updatedAt: now,
        }));
        return;
      }

      if (event.type === "uiDelta") {
        updateWidget(boardId, id, (widget) => ({
          ...widget,
          openuiSource: `${widget.openuiSource}${event.delta}`,
          updatedAt: now,
        }));
        return;
      }

      if (event.type === "error") {
        updateWidget(boardId, id, (widget) => ({
          ...widget,
          error: event.error,
          status: "error",
          updatedAt: now,
        }));
        return;
      }

      updateWidget(boardId, id, (widget) => ({
        ...widget,
        status: "done",
        updatedAt: now,
      }));
    },
    [updateWidget],
  );

  const generateWidget = useCallback(
    async (boardId: string, id: string, prompt: string) => {
      updateWidget(boardId, id, (widget) => ({
        ...widget,
        contentFitKey: undefined,
        error: undefined,
        exampleData: null,
        openuiSource: "",
        status: "streaming",
        updatedAt: Date.now(),
      }));

      let sawTerminalEvent = false;

      try {
        const response = await fetch("/api/generate-widget", {
          body: JSON.stringify({ prompt }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok || !response.body) {
          throw new Error("The widget generation API did not return a stream.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          buffer += decoder.decode(value, { stream: !done });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) {
              continue;
            }

            const event = JSON.parse(line) as WidgetStreamEvent;
            sawTerminalEvent = event.type === "done" || event.type === "error" || sawTerminalEvent;
            handleStreamEvent(boardId, id, event);
          }

          if (done) {
            break;
          }
        }

        if (buffer.trim()) {
          const event = JSON.parse(buffer) as WidgetStreamEvent;
          sawTerminalEvent = event.type === "done" || event.type === "error" || sawTerminalEvent;
          handleStreamEvent(boardId, id, event);
        }

        if (!sawTerminalEvent) {
          throw new Error("Generation stopped before the widget finished.");
        }
      } catch (error) {
        updateWidget(boardId, id, (widget) => ({
          ...widget,
          error: streamErrorMessage(error),
          status: "error",
          updatedAt: Date.now(),
        }));
      }
    },
    [handleStreamEvent, updateWidget],
  );

  const createWidgetFromCommand = useCallback(
    (nextCommand: CommandState) => {
      const prompt = nextCommand.value.trim();
      const boardId = activeBoardId;

      if (!prompt) {
        return;
      }

      const now = Date.now();
      const id = createWidgetId();
      const position = clampCanvasRectPosition(
        nextCommand.x,
        nextCommand.y,
        DEFAULT_WIDGET_WIDTH,
        DEFAULT_WIDGET_HEIGHT,
      );
      const widget: CanvasWidget = {
        authorName: DEFAULT_NOTE_AUTHOR_NAME,
        createdAt: now,
        exampleData: null,
        height: DEFAULT_WIDGET_HEIGHT,
        id,
        openuiSource: "",
        prompt,
        status: "streaming",
        updatedAt: now,
        width: DEFAULT_WIDGET_WIDTH,
        x: position.x,
        y: position.y,
      };

      addWidgetToBoard(boardId, widget);
      setCommand(null);
      void generateWidget(boardId, id, prompt);
    },
    [activeBoardId, addWidgetToBoard, generateWidget],
  );

  const retryWidget = useCallback(
    (widget: CanvasWidget) => {
      void generateWidget(activeBoardId, widget.id, widget.prompt);
    },
    [activeBoardId, generateWidget],
  );

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();
      const nextZoom = zoomRef.current * Math.exp(-event.deltaY * ZOOM_SENSITIVITY);

      setCanvasZoom(nextZoom, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [setCanvasZoom],
  );

  const startWidgetInteraction = useCallback(
    (event: PointerEvent<HTMLElement>, interaction: WidgetInteraction) => {
      event.preventDefault();
      event.stopPropagation();
      widgetInteractionRef.current = interaction;
      viewportRef.current?.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    if (hasClosestElement(event.target, "[data-command-input], [data-widget], [data-note]")) {
      return;
    }

    stopEditingNote();
    setCommand(null);

    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    panRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };

    viewport.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }, [stopEditingNote]);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      updateCursorPosition(event);

      const interaction = widgetInteractionRef.current;

      if (interaction) {
        const deltaX = (event.clientX - interaction.startClientX) / scale;
        const deltaY = (event.clientY - interaction.startClientY) / scale;

        if (interaction.type === "drag") {
          updateWidget(activeBoardId, interaction.id, (widget) => ({
            ...widget,
            updatedAt: Date.now(),
            ...clampCanvasRectPosition(
              interaction.startX + deltaX,
              interaction.startY + deltaY,
              widget.width,
              widget.height,
            ),
          }));
        } else if (interaction.type === "resize") {
          updateWidget(activeBoardId, interaction.id, (widget) => {
            const width = Math.min(
              CANVAS_WIDTH - widget.x,
              Math.max(MIN_WIDGET_WIDTH, interaction.startWidth + deltaX),
            );
            const height = Math.min(
              CANVAS_HEIGHT - widget.y,
              Math.max(MIN_WIDGET_HEIGHT, interaction.startHeight + deltaY),
            );
            const position = clampCanvasRectPosition(widget.x, widget.y, width, height);

            return {
              ...widget,
              height,
              updatedAt: Date.now(),
              width,
              ...position,
            };
          });
        } else if (interaction.type === "note-drag") {
          updateNote(activeBoardId, interaction.id, (note) => ({
            ...note,
            updatedAt: Date.now(),
            ...clampCanvasRectPosition(
              interaction.startX + deltaX,
              interaction.startY + deltaY,
              note.width,
              note.height,
            ),
          }));
        } else {
          updateNoteFields(interaction.id, {
            height: Math.min(
              CANVAS_HEIGHT,
              Math.max(DEFAULT_NOTE_HEIGHT, interaction.startHeight + deltaY),
            ),
            width: Math.min(
              MAX_NOTE_WIDTH,
              Math.max(DEFAULT_NOTE_WIDTH, interaction.startWidth + deltaX),
            ),
          });
        }

        return;
      }

      const viewport = viewportRef.current;
      const pan = panRef.current;

      if (!viewport || !pan.active) {
        return;
      }

      viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
      viewport.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
    },
    [activeBoardId, scale, updateCursorPosition, updateNote, updateNoteFields, updateWidget],
  );

  const endPointerInteraction = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;

    widgetInteractionRef.current = null;
    panRef.current.active = false;

    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    setIsPanning(false);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--app-bg)] p-3 text-[var(--text-primary)] sm:p-5">
      <section className="relative h-[calc(100vh-1.5rem)] overflow-hidden rounded-lg border border-[var(--border-medium)] bg-[var(--panel)] shadow-[var(--shadow-panel)] sm:h-[calc(100vh-2.5rem)]">
        <div
          ref={viewportRef}
          className={`absolute inset-0 overflow-auto bg-[var(--canvas-bg)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isPanning ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerCancel={endPointerInteraction}
          onPointerDown={handlePointerDown}
          onPointerEnter={updateCursorPosition}
          onPointerLeave={(event) => {
            cursorRef.current.inside = false;
            endPointerInteraction(event);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerInteraction}
          onWheel={handleWheel}
        >
          <div aria-label="Scrollable grid canvas" className="relative" style={canvasStyle}>
            {widgets.map((widget) => (
              <WidgetFrame
                accent={activeBoardAccent}
                key={widget.id}
                onBringToFront={(id) => bringWidgetToFront(activeBoardId, id)}
                onDelete={deleteWidget}
                onContentMeasured={fitWidgetToContent}
                onRetry={retryWidget}
                onStartInteraction={startWidgetInteraction}
                scale={scale}
                widget={widget}
              />
            ))}
            {notes.map((note) => (
              <NoteFrame
                focusTarget={editingNoteId === note.id ? editingNoteFocus : null}
                isEditing={editingNoteId === note.id}
                isManuallySized={manuallySizedNoteIdsRef.current.has(note.id)}
                isNewlyCreated={newlyCreatedNoteId === note.id}
                key={note.id}
                note={note}
                onBringToFront={(id) => bringNoteToFront(activeBoardId, id)}
                onDelete={deleteNote}
                onEdit={editNote}
                onFocusHandled={handleNoteFocusHandled}
                onStopEditing={stopEditingNote}
                onStartInteraction={startWidgetInteraction}
                onUpdate={updateNoteFields}
                scale={scale}
              />
            ))}
          </div>

          {command ? (
            <form
              className="absolute z-30 flex h-10 w-[17rem] items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--panel-translucent-strong)] px-2.5 shadow-[var(--shadow-popover)] backdrop-blur sm:w-[25rem]"
              data-command-input
              onSubmit={(event) => {
                event.preventDefault();
                createWidgetFromCommand(command);
              }}
              style={{
                left: command.x * scale + 8,
                top: command.y * scale + 8,
              }}
            >
              <span className="select-none text-base font-semibold text-[var(--text-muted)]">/</span>
              <input
                ref={commandInputRef}
                aria-label="Canvas command"
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
                onChange={(event) => {
                  setCommand((current) =>
                    current
                      ? {
                          ...current,
                          value: event.target.value,
                        }
                      : current,
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setCommand(null);
                  }
                }}
                placeholder="show burn rate, top contributors, forecast inputs..."
                value={command.value}
              />
              <button
                aria-label="Close command"
                className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--control-hover)]"
                onClick={() => setCommand(null)}
                title="Close"
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : null}
        </div>

        <div className="absolute left-8 right-36 top-4 z-50 flex items-center gap-2 rounded-md border border-[var(--border-medium)] bg-[var(--panel-translucent)] px-2 py-1.5 text-sm font-medium shadow-sm backdrop-blur sm:left-14 sm:right-40 sm:top-6">
          <span className="flex shrink-0 items-baseline gap-1 text-sm">
            <span className="font-semibold text-[var(--text-primary)]">AI</span>
            <span className="font-medium text-[var(--text-muted)]">Whiteboards</span>
          </span>
          <span className="h-4 w-px shrink-0 bg-[var(--border-strong)]" />
          <div className="relative min-w-0 flex-1">
            {boardTabsScrollState.hasOverflow ? (
              <>
                <div
                  className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-gradient-to-r from-[var(--panel)] via-[var(--panel-translucent-strong)] to-transparent transition-opacity duration-150 ${
                    boardTabsScrollState.canScrollLeft ? "opacity-100" : "opacity-0"
                  }`}
                />
                <button
                  aria-label="Scroll whiteboards left"
                  className={`absolute inset-y-0 left-0 z-20 grid w-5 place-items-center rounded-sm text-[var(--text-muted)] transition duration-150 hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] ${
                    boardTabsScrollState.canScrollLeft
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                  disabled={!boardTabsScrollState.canScrollLeft}
                  onClick={() => scrollBoardTabs("left")}
                  tabIndex={boardTabsScrollState.canScrollLeft ? 0 : -1}
                  title="Scroll whiteboards left"
                  type="button"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
              </>
            ) : null}
            <div
              ref={boardTabsScrollRef}
              className="flex min-w-0 flex-1 scroll-px-8 items-center gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={updateBoardTabsScrollState}
            >
              <div className="flex shrink-0 items-center gap-1">
                {prebuiltBoards.map((board) => {
                  const isActive = board.id === activeBoardId;

                  return (
                    <button
                      aria-pressed={isActive}
                      className={`relative flex h-8 shrink-0 items-center justify-center gap-1.5 px-2.5 text-sm font-semibold leading-none transition focus:outline-none focus-visible:outline-none ${
                        isActive
                          ? "text-[var(--text-primary)] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-[var(--board-founder-accent)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                      data-board-tab-id={board.id}
                      key={board.id}
                      onClick={() => selectBoard(board.id)}
                      title={board.name}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-4 w-4 shrink-0 place-items-center text-[15px] leading-none"
                      >
                        {boardEmoji(board.id)}
                      </span>
                      <span className="min-w-0 truncate leading-none">{board.name}</span>
                    </button>
                  );
                })}
              </div>
              <span className="h-5 w-px shrink-0 bg-[var(--border-medium)]" />
              <div className="flex shrink-0 items-center gap-1">
                {personalBoards.map((board) => {
                  const isActive = board.id === activeBoardId;
                  const canDelete = personalBoards.length > 1;

                  return (
                    <div
                      className={`group relative flex h-8 shrink-0 items-center text-sm font-semibold leading-none transition ${
                        isActive
                          ? "text-[var(--text-primary)] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-[var(--board-founder-accent)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                      data-board-tab-id={board.id}
                      key={board.id}
                      title={board.name}
                    >
                      <button
                        aria-pressed={isActive}
                        className="flex h-full max-w-40 items-center justify-center gap-1.5 px-2.5 text-inherit focus:outline-none focus-visible:outline-none"
                        onClick={() => selectBoard(board.id)}
                        type="button"
                      >
                        <span className="min-w-0 truncate leading-none">{board.name}</span>
                      </button>
                      {canDelete ? (
                        <button
                          aria-label={`Delete ${board.name} whiteboard`}
                          className="absolute right-0 top-1/2 z-10 grid h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 place-items-center text-[var(--text-muted)] opacity-0 transition hover:text-[var(--text-primary)] group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteBoard(board.id);
                          }}
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            {boardTabsScrollState.hasOverflow ? (
              <>
                <div
                  className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-gradient-to-l from-[var(--panel)] via-[var(--panel-translucent-strong)] to-transparent transition-opacity duration-150 ${
                    boardTabsScrollState.canScrollRight ? "opacity-100" : "opacity-0"
                  }`}
                />
                <button
                  aria-label="Scroll whiteboards right"
                  className={`absolute inset-y-0 right-0 z-20 grid w-5 place-items-center rounded-sm text-[var(--text-muted)] transition duration-150 hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] ${
                    boardTabsScrollState.canScrollRight
                      ? "opacity-100"
                      : "pointer-events-none opacity-0"
                  }`}
                  disabled={!boardTabsScrollState.canScrollRight}
                  onClick={() => scrollBoardTabs("right")}
                  tabIndex={boardTabsScrollState.canScrollRight ? 0 : -1}
                  title="Scroll whiteboards right"
                  type="button"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </>
            ) : null}
          </div>
          {isCreatingBoardName ? (
            <form
              className="flex h-8 shrink-0 items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                createNamedBlankBoard();
              }}
            >
              <input
                aria-label="New whiteboard name"
                className="h-8 w-36 rounded border border-[var(--border-strong)] bg-[var(--panel)] px-2 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--focus-border)]"
                maxLength={48}
                onChange={(event) => setBoardNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelBoardNameCreate();
                  }
                }}
                placeholder="Name"
                ref={boardNameInputRef}
                value={boardNameDraft}
              />
              <button
                className="h-8 rounded border border-[var(--primary)] bg-[var(--primary)] px-2.5 text-sm font-semibold leading-none text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:border-[var(--border-strong)] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)]"
                disabled={!boardNameDraft.trim()}
                type="submit"
              >
                Create
              </button>
              <button
                className="h-8 rounded border border-transparent px-2.5 text-sm font-semibold leading-none text-[var(--text-muted)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]"
                onClick={cancelBoardNameCreate}
                type="button"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              aria-label="Create blank whiteboard"
              className="grid h-8 w-8 shrink-0 place-items-center rounded border border-transparent text-[var(--text-secondary)] transition hover:border-[var(--border)] hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]"
              onClick={openBoardNameCreate}
              title="Create blank whiteboard"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="absolute right-4 top-4 z-50 flex items-center gap-2 rounded-md border border-[var(--border-medium)] bg-[var(--panel-translucent)] px-2 py-1 text-sm font-medium shadow-sm backdrop-blur sm:right-6 sm:top-6">
          <button
            aria-label={`Switch to ${nextTheme} mode`}
            className="grid h-7 w-7 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)]"
            onClick={() => setTheme(nextTheme)}
            title={`Switch to ${nextTheme} mode`}
            type="button"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            aria-label="Zoom out"
            className="grid h-7 w-7 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            disabled={!canZoomOut}
            onClick={() => adjustZoom(1 / ZOOM_STEP_FACTOR)}
            title="Zoom out"
            type="button"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Zoom in"
            className="grid h-7 w-7 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            disabled={!canZoomIn}
            onClick={() => adjustZoom(ZOOM_STEP_FACTOR)}
            title="Zoom in"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-50 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel-translucent)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] shadow-sm backdrop-blur sm:bottom-6 sm:left-6">
          <span>
            Press <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">/</span> to create a widget
          </span>
          <span className="h-3 w-px bg-[var(--border-strong)]" />
          <span>
            <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">N</span> to add a note
          </span>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 z-50 rounded-md border border-[var(--border)] bg-[var(--panel-translucent)] px-2 py-1 text-xs font-medium text-[var(--text-muted)] shadow-sm backdrop-blur sm:bottom-6 sm:right-6">
          {Math.round(zoom)}%
        </div>

      </section>
    </main>
  );
}
