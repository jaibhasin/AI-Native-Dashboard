"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { aiBoardPlanSchema, type AiBoardBrief, type AiBoardPlan } from "@/lib/ai-board-schemas";
import { BLANK_BOARD_ID } from "@/lib/board-templates";
import {
  DEFAULT_NOTE_AUTHOR_NAME,
  type CanvasBoard,
  type CanvasNote,
  type CanvasWidget,
} from "@/lib/dashboard-schemas";
import type { WidgetStreamEvent } from "@/lib/widget-stream";
import { BoardTabs } from "@/app/_components/whiteboard/BoardTabs";
import { CanvasCommand } from "@/app/_components/whiteboard/CanvasCommand";
import { CanvasOverlays } from "@/app/_components/whiteboard/CanvasOverlays";
import { CreateWithAIBoardModal } from "@/app/_components/whiteboard/CreateWithAIBoardModal";
import { NoteFrame } from "@/app/_components/whiteboard/NoteFrame";
import { WidgetFrame } from "@/app/_components/whiteboard/WidgetFrame";
import {
  ACTIVE_BOARD_STORAGE_KEY,
  AI_BOARD_WIDGET_CONCURRENCY,
  BOARD_STORAGE_KEY,
  BOARD_TAB_SCROLL_EPSILON,
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_WIDGET_HEIGHT,
  DEFAULT_WIDGET_WIDTH,
  GRID_SIZE,
  MAJOR_GRID_SIZE,
  MAX_NOTE_HEIGHT,
  MAX_NOTE_WIDTH,
  MAX_ZOOM,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
  MIN_ZOOM,
  noteColorOptions,
  THEME_STORAGE_KEY,
  TOP_CANVAS_SAFE_INSET,
  ZOOM_SENSITIVITY,
  ZOOM_STEP_FACTOR,
} from "@/app/_lib/whiteboard/constants";
import {
  boardAccent,
  boardBounds,
  boardNotes,
  clampCanvasPoint,
  clampCanvasRectPosition,
  clampZoom,
  contentFitKey,
  createBoardId,
  createNoteId,
  createWidgetId,
  fitZoomForBoard,
  fittedWidgetHeight,
  hasClosestElement,
  isEditableTarget,
  noteTextSize,
  streamErrorMessage,
} from "@/app/_lib/whiteboard/geometry";
import {
  createBlankBoard,
  ensureBoardSet,
  parseStoredBoards,
  storedActiveBoardId,
} from "@/app/_lib/whiteboard/storage";
import { preferredTheme } from "@/app/_lib/whiteboard/theme";
import type {
  AiBoardBriefField,
  CommandState,
  ElementSize,
  NoteFocusTarget,
  PendingZoomScroll,
  ThemeMode,
  WidgetInteraction,
} from "@/app/_lib/whiteboard/types";

function emptyAiBoardBrief(): AiBoardBrief {
  return {
    audience: "",
    dataSources: "",
    metrics: "",
    notes: "",
    purpose: "",
    tasks: "",
  };
}

export default function Home() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardTabsScrollRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const boardNameInputRef = useRef<HTMLInputElement>(null);
  const aiBoardPurposeInputRef = useRef<HTMLTextAreaElement>(null);
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
  const [isCreatingAiBoard, setIsCreatingAiBoard] = useState(false);
  const [isGeneratingAiBoard, setIsGeneratingAiBoard] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState("");
  const [aiBoardBrief, setAiBoardBrief] = useState<AiBoardBrief>(() => emptyAiBoardBrief());
  const [aiBoardError, setAiBoardError] = useState<string | null>(null);
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

  const openAiBoardCreate = useCallback(() => {
    setIsCreatingAiBoard(true);
    setIsCreatingBoardName(false);
    setAiBoardError(null);
    setCommand(null);
    stopEditingNote();
  }, [stopEditingNote]);

  const closeAiBoardCreate = useCallback(() => {
    if (isGeneratingAiBoard) {
      return;
    }

    setIsCreatingAiBoard(false);
    setAiBoardError(null);
  }, [isGeneratingAiBoard]);

  const updateAiBoardBrief = useCallback((field: AiBoardBriefField, value: string) => {
    setAiBoardBrief((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "purpose") {
      setAiBoardError(null);
    }
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

  useEffect(() => {
    if (!isCreatingAiBoard) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      aiBoardPurposeInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isCreatingAiBoard]);

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

  const generateAiBoardWidgets = useCallback(
    async (boardId: string, plannedWidgets: CanvasWidget[]) => {
      let nextIndex = 0;
      const workerCount = Math.min(AI_BOARD_WIDGET_CONCURRENCY, plannedWidgets.length);

      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (nextIndex < plannedWidgets.length) {
            const widget = plannedWidgets[nextIndex];
            nextIndex += 1;
            await generateWidget(boardId, widget.id, widget.prompt);
          }
        }),
      );
    },
    [generateWidget],
  );

  const createAiBoardFromPlan = useCallback(
    (plan: AiBoardPlan) => {
      const now = Date.now();
      const boardId = createBoardId();
      const notes: CanvasNote[] = plan.notes.map((plannedNote, index) => {
        const fittedSize = noteTextSize(plannedNote.title, plannedNote.body);
        const width = Math.min(
          MAX_NOTE_WIDTH,
          Math.max(DEFAULT_NOTE_WIDTH, plannedNote.width || fittedSize.width, fittedSize.width),
        );
        const height = Math.min(
          MAX_NOTE_HEIGHT,
          Math.max(DEFAULT_NOTE_HEIGHT, plannedNote.height || fittedSize.height, fittedSize.height),
        );
        const position = clampCanvasRectPosition(plannedNote.x, plannedNote.y, width, height);

        return {
          authorName: DEFAULT_NOTE_AUTHOR_NAME,
          body: plannedNote.body,
          color: plannedNote.color,
          createdAt: now + index,
          height,
          id: createNoteId(),
          title: plannedNote.title,
          updatedAt: now + index,
          width,
          ...position,
        };
      });
      const widgets: CanvasWidget[] = plan.widgets.map((plannedWidget, index) => {
        const width = Math.min(560, Math.max(MIN_WIDGET_WIDTH, Math.round(plannedWidget.width)));
        const height = Math.min(420, Math.max(MIN_WIDGET_HEIGHT, Math.round(plannedWidget.height)));
        const position = clampCanvasRectPosition(plannedWidget.x, plannedWidget.y, width, height);

        return {
          authorName: DEFAULT_NOTE_AUTHOR_NAME,
          createdAt: now + index,
          exampleData: null,
          height,
          id: createWidgetId(),
          openuiSource: "",
          prompt: plannedWidget.prompt,
          status: "streaming",
          updatedAt: now + index,
          width,
          ...position,
        };
      });
      const board: CanvasBoard = {
        createdAt: now,
        id: boardId,
        name: plan.boardName.trim().slice(0, 48) || "AI Whiteboard",
        notes,
        updatedAt: now,
        widgets,
      };

      setBoards((current) => [...current, board]);
      setActiveBoardId(board.id);
      setIsCreatingAiBoard(false);
      setAiBoardError(null);
      setAiBoardBrief(emptyAiBoardBrief());
      setCommand(null);
      stopEditingNote();

      requestAnimationFrame(() => focusBoard(board));
      void generateAiBoardWidgets(board.id, widgets);
    },
    [focusBoard, generateAiBoardWidgets, stopEditingNote],
  );

  const createBoardWithAi = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const brief: AiBoardBrief = {
        audience: aiBoardBrief.audience.trim(),
        dataSources: aiBoardBrief.dataSources.trim(),
        metrics: aiBoardBrief.metrics.trim(),
        notes: aiBoardBrief.notes.trim(),
        purpose: aiBoardBrief.purpose.trim(),
        tasks: aiBoardBrief.tasks.trim(),
      };

      if (!brief.purpose) {
        setAiBoardError("Describe what this whiteboard is for.");
        aiBoardPurposeInputRef.current?.focus();
        return;
      }

      setIsGeneratingAiBoard(true);
      setAiBoardError(null);

      try {
        const response = await fetch("/api/generate-board", {
          body: JSON.stringify(brief),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const body = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          const error =
            body && typeof body === "object" && "error" in body && typeof body.error === "string"
              ? body.error
              : "Board generation failed.";

          throw new Error(error);
        }

        createAiBoardFromPlan(aiBoardPlanSchema.parse(body));
      } catch (error) {
        setAiBoardError(error instanceof Error ? error.message : "Board generation failed.");
      } finally {
        setIsGeneratingAiBoard(false);
      }
    },
    [aiBoardBrief, createAiBoardFromPlan],
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
            <CanvasCommand
              command={command}
              commandInputRef={commandInputRef}
              createWidgetFromCommand={createWidgetFromCommand}
              scale={scale}
              setCommand={setCommand}
            />
          ) : null}
        </div>

        {isCreatingAiBoard ? (
          <CreateWithAIBoardModal
            brief={aiBoardBrief}
            error={aiBoardError}
            isGenerating={isGeneratingAiBoard}
            onClose={closeAiBoardCreate}
            onSubmit={createBoardWithAi}
            onUpdate={updateAiBoardBrief}
            purposeInputRef={aiBoardPurposeInputRef}
          />
        ) : null}
        <BoardTabs
          activeBoardId={activeBoardId}
          boardNameDraft={boardNameDraft}
          boardNameInputRef={boardNameInputRef}
          boardTabsScrollRef={boardTabsScrollRef}
          boardTabsScrollState={boardTabsScrollState}
          cancelBoardNameCreate={cancelBoardNameCreate}
          createNamedBlankBoard={createNamedBlankBoard}
          deleteBoard={deleteBoard}
          isCreatingBoardName={isCreatingBoardName}
          openAiBoardCreate={openAiBoardCreate}
          openBoardNameCreate={openBoardNameCreate}
          personalBoards={personalBoards}
          prebuiltBoards={prebuiltBoards}
          scrollBoardTabs={scrollBoardTabs}
          selectBoard={selectBoard}
          setBoardNameDraft={setBoardNameDraft}
          updateBoardTabsScrollState={updateBoardTabsScrollState}
        />
        <CanvasOverlays
          adjustZoom={adjustZoom}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          nextTheme={nextTheme}
          setTheme={setTheme}
          theme={theme}
          zoom={zoom}
        />

      </section>
    </main>
  );
}
