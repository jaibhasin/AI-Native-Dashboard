"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { BLANK_BOARD_ID } from "@/lib/board-templates";
import {
  DEFAULT_NOTE_AUTHOR_NAME,
  type CanvasBoard,
  type CanvasNote,
  type CanvasWidget,
} from "@/lib/dashboard-schemas";
import { BoardTabs } from "@/app/_components/whiteboard/BoardTabs";
import { CanvasCommand } from "@/app/_components/whiteboard/CanvasCommand";
import { CanvasOverlays } from "@/app/_components/whiteboard/CanvasOverlays";
import { CreateWithAIBoardModal } from "@/app/_components/whiteboard/CreateWithAIBoardModal";
import { NoteFrame } from "@/app/_components/whiteboard/NoteFrame";
import { WidgetFrame } from "@/app/_components/whiteboard/WidgetFrame";
import {
  ACTIVE_BOARD_STORAGE_KEY,
  BOARD_STORAGE_KEY,
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  MAX_NOTE_WIDTH,
  MAX_ZOOM,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
  MIN_ZOOM,
} from "@/app/_lib/whiteboard/constants";
import { createCommandWidget, nextNoteColor } from "@/app/_lib/whiteboard/generation";
import {
  boardAccent,
  boardBounds,
  boardNotes,
  clampCanvasPoint,
  clampCanvasRectPosition,
  contentFitKey,
  createNoteId,
  fittedWidgetHeight,
  hasClosestElement,
  isEditableTarget,
  noteTextSize,
} from "@/app/_lib/whiteboard/geometry";
import {
  createBlankBoard,
  ensureBoardSet,
  parseStoredBoards,
  storedActiveBoardId,
} from "@/app/_lib/whiteboard/storage";
import type { CommandState, ElementSize, WidgetInteraction } from "@/app/_lib/whiteboard/types";
import { useBoardTabsScroll } from "@/app/_lib/whiteboard/useBoardTabsScroll";
import { useBoardCreation } from "@/app/_lib/whiteboard/useBoardCreation";
import { useBoardMutations } from "@/app/_lib/whiteboard/useBoardMutations";
import { useCanvasStyle } from "@/app/_lib/whiteboard/useCanvasStyle";
import { useCanvasViewport } from "@/app/_lib/whiteboard/useCanvasViewport";
import { useNoteEditing } from "@/app/_lib/whiteboard/useNoteEditing";
import { useThemeMode } from "@/app/_lib/whiteboard/useThemeMode";
import { useWidgetGeneration } from "@/app/_lib/whiteboard/useWidgetGeneration";

export default function Home() {
  const commandInputRef = useRef<HTMLInputElement>(null);
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
  const hasScrolledHydratedBoardRef = useRef(false);
  const manuallySizedNoteIdsRef = useRef<Set<string>>(new Set());

  const [isPanning, setIsPanning] = useState(false);
  const [command, setCommand] = useState<CommandState | null>(null);
  const [boards, setBoards] = useState<CanvasBoard[]>(() => ensureBoardSet([createBlankBoard()]));
  const [activeBoardId, setActiveBoardId] = useState(BLANK_BOARD_ID);
  const [hasHydratedBoards, setHasHydratedBoards] = useState(false);
  const [theme, setTheme] = useThemeMode();
  const { adjustZoom, focusBoard, getVisibleCanvasCenter, handleWheel, scale, viewportRef, zoom } =
    useCanvasViewport();
  const commandPosition = command ? `${command.x}:${command.y}` : null;
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0];
  const activeBoardIsTemplate = Boolean(activeBoard?.templateId);
  const widgets = activeBoard?.widgets ?? [];
  const notes = boardNotes(activeBoard);
  const activeBoardAccent = useMemo(() => boardAccent(activeBoard?.templateId), [activeBoard?.templateId]);
  const canvasStyle = useCanvasStyle(activeBoardAccent, scale);
  const personalBoards = boards.filter((board) => !board.templateId);
  const prebuiltBoards = boards.filter((board) => board.templateId);
  const totalBoardCount = prebuiltBoards.length + personalBoards.length;
  const canZoomOut = zoom > MIN_ZOOM;
  const canZoomIn = zoom < MAX_ZOOM;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const {
    bringNoteToFront,
    bringWidgetToFront,
    updateBoardNotes,
    updateBoardWidgets,
    updateNote,
    updateWidget,
  } = useBoardMutations(setBoards);
  const {
    deleteNote,
    editingNoteFocus,
    editingNoteId,
    editNote,
    handleNoteFocusHandled,
    isNoteManuallySized,
    newlyCreatedNoteId,
    setEditingNoteId,
    setEditingNoteFocus,
    setNewlyCreatedNoteId,
    stopEditingNote,
    updateNoteFields,
  } = useNoteEditing(activeBoardId, manuallySizedNoteIdsRef, updateBoardNotes, updateNote);
  const { generateAiBoardWidgets, generateWidget } = useWidgetGeneration(updateWidget);
  const {
    aiBoardBrief,
    aiBoardError,
    aiBoardPurposeInputRef,
    boardNameDraft,
    boardNameInputRef,
    cancelBoardNameCreate,
    closeAiBoardCreate,
    createBoardWithAi,
    createNamedBlankBoard,
    deleteBoard,
    isCreatingAiBoard,
    isCreatingBoardName,
    isGeneratingAiBoard,
    openAiBoardCreate,
    openBoardNameCreate,
    selectBoard,
    setBoardNameDraft,
    updateAiBoardBrief,
  } = useBoardCreation({
    activeBoardId,
    boards,
    focusBoard,
    generateAiBoardWidgets,
    setActiveBoardId,
    setBoards,
    setCommand,
    stopEditingNote,
  });
  const { boardTabsScrollRef, boardTabsScrollState, scrollBoardTabs, updateBoardTabsScrollState } =
    useBoardTabsScroll(activeBoardId, totalBoardCount, isCreatingBoardName);
  const deleteWidget = useCallback(
    (id: string) => {
      updateBoardWidgets(activeBoardId, (current) => current.filter((widget) => widget.id !== id));
    },
    [activeBoardId, updateBoardWidgets],
  );

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

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const storedBoards = parseStoredBoards();

      setBoards(storedBoards);
      setActiveBoardId(storedActiveBoardId(storedBoards));
      setHasHydratedBoards(true);
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
    [scale, viewportRef],
  );

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
      color: nextNoteColor(currentNotes.length),
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
  }, [
    activeBoard,
    focusBoard,
    getVisibleCanvasCenter,
    setEditingNoteFocus,
    setEditingNoteId,
    setNewlyCreatedNoteId,
    updateBoardNotes,
  ]);

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

  const createWidgetFromCommand = useCallback(
    (nextCommand: CommandState) => {
      const prompt = nextCommand.value.trim();
      const boardId = activeBoardId;

      if (!prompt) {
        return;
      }

      const { id, widget } = createCommandWidget(nextCommand);

      addWidgetToBoard(boardId, widget);
      setCommand(null);
      void generateWidget(boardId, id, prompt);
    },
    [activeBoardId, addWidgetToBoard, generateWidget],
  );

  const retryWidget = useCallback(
    (widget: CanvasWidget) => {
      void generateWidget(activeBoardId, widget.id, widget.prompt, widget.exampleData);
    },
    [activeBoardId, generateWidget],
  );

  const startWidgetInteraction = useCallback(
    (event: PointerEvent<HTMLElement>, interaction: WidgetInteraction) => {
      event.preventDefault();
      event.stopPropagation();
      widgetInteractionRef.current = interaction;
      viewportRef.current?.setPointerCapture(event.pointerId);
    },
    [viewportRef],
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
  }, [stopEditingNote, viewportRef]);

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
    [activeBoardId, scale, updateCursorPosition, updateNote, updateNoteFields, updateWidget, viewportRef],
  );

  const endPointerInteraction = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;

    widgetInteractionRef.current = null;
    panRef.current.active = false;

    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    setIsPanning(false);
  }, [viewportRef]);

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
                isManuallySized={isNoteManuallySized(note.id)}
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
