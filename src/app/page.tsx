"use client";

import { Renderer, type OpenUIError } from "@openuidev/react-lang";
import { GripVertical, Maximize2, RotateCcw, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { z } from "zod/v4";
import { canvasWidgetSchema, type CanvasWidget } from "@/lib/dashboard-schemas";
import type { WidgetStreamEvent } from "@/lib/widget-stream";
import { dashboardRenderLibrary } from "@/openui/dashboard-render-library";

const CANVAS_WIDTH = 3600;
const CANVAS_HEIGHT = 2400;
const GRID_SIZE = 24;
const MAJOR_GRID_SIZE = 120;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;
const DEFAULT_WIDGET_WIDTH = 440;
const DEFAULT_WIDGET_HEIGHT = 320;
const MIN_WIDGET_WIDTH = 280;
const MIN_WIDGET_HEIGHT = 200;
const STORAGE_KEY = "new-dashboard.canvas.widgets.v1";

type CommandState = {
  x: number;
  y: number;
  value: string;
};

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
    };

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

function createWidgetId() {
  return globalThis.crypto?.randomUUID?.() ?? `widget-${Date.now()}-${Math.random()}`;
}

function parseStoredWidgets() {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const widgets = z.array(canvasWidgetSchema).parse(JSON.parse(stored));

    return widgets.map((widget) =>
      widget.status === "streaming"
        ? {
            ...widget,
            status: "error" as const,
            error: "Generation was interrupted. Retry this widget to continue.",
          }
        : widget,
    );
  } catch {
    return [];
  }
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

function StreamingSkeleton({ widget }: { widget: CanvasWidget }) {
  return (
    <div className="h-full bg-[#fbfcfe] p-4">
      <div className="mb-4">
        <div className="h-4 w-44 animate-pulse rounded bg-[#e5e7eb]" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded bg-[#eef0f3]" />
      </div>
      {widget.exampleData ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {widget.exampleData.metrics.slice(0, 4).map((metric, index) => (
              <div className="rounded-md border border-[#e5e7eb] bg-white p-3" key={`${metric.label}-${index}`}>
                <div className="truncate text-[11px] font-medium uppercase text-[#71717a]">{metric.label}</div>
                <div className="mt-1 truncate text-xl font-semibold text-[#18181b]">{metric.value}</div>
              </div>
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-md border border-[#e5e7eb] bg-white" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="h-20 animate-pulse rounded-md bg-[#eef0f3]" />
            <div className="h-20 animate-pulse rounded-md bg-[#eef0f3]" />
          </div>
          <div className="h-32 animate-pulse rounded-md bg-[#eef0f3]" />
        </div>
      )}
      <div className="mt-4 text-xs font-medium text-[#71717a]">
        {widget.exampleData ? "Composing widget UI..." : "Generating preview data..."}
      </div>
    </div>
  );
}

function WidgetBody({ widget }: { widget: CanvasWidget }) {
  const [renderErrors, setRenderErrors] = useState<OpenUIError[]>([]);

  if (widget.status === "error") {
    return (
      <div className="grid h-full place-items-center bg-[#fbfcfe] p-5 text-center">
        <div className="max-w-[18rem]">
          <div className="text-sm font-semibold text-[#18181b]">Generation failed</div>
          <div className="mt-2 text-xs leading-5 text-[#71717a]">{widget.error}</div>
        </div>
      </div>
    );
  }

  if (!widget.openuiSource) {
    return <StreamingSkeleton widget={widget} />;
  }

  return (
    <div className="relative h-full overflow-hidden bg-[#fbfcfe]">
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
      {renderErrors.length ? (
        <div className="absolute bottom-2 left-2 right-2 rounded border border-[#fed7aa] bg-[#fff7ed] px-2 py-1 text-[11px] font-medium text-[#9a3412] shadow-sm">
          Some generated UI was ignored: {renderErrors[0]?.message}
        </div>
      ) : null}
    </div>
  );
}

function WidgetFrame({
  onDelete,
  onRetry,
  onStartInteraction,
  scale,
  widget,
}: {
  onDelete: (id: string) => void;
  onRetry: (widget: CanvasWidget) => void;
  onStartInteraction: (event: PointerEvent<HTMLElement>, interaction: WidgetInteraction) => void;
  scale: number;
  widget: CanvasWidget;
}) {
  const title = widget.exampleData?.title || widget.prompt;
  const statusLabel =
    widget.status === "streaming" ? "Generating" : widget.status === "error" ? "Error" : "Preview";

  return (
    <div
      className="absolute z-10"
      data-widget
      style={{
        height: widget.height * scale,
        left: widget.x * scale,
        top: widget.y * scale,
        width: widget.width * scale,
      }}
    >
      <article
        className="flex h-full overflow-hidden rounded-md border border-[#d7dce4] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.14)]"
        style={{
          height: widget.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: widget.width,
        }}
      >
        <div className="flex min-h-0 w-full flex-col">
          <header
            className="flex h-11 shrink-0 cursor-grab items-center gap-2 border-b border-[#e5e7eb] bg-white px-2.5 active:cursor-grabbing"
            onPointerDown={(event) =>
              onStartInteraction(event, {
                id: widget.id,
                startClientX: event.clientX,
                startClientY: event.clientY,
                startX: widget.x,
                startY: widget.y,
                type: "drag",
              })
            }
          >
            <GripVertical className="h-4 w-4 shrink-0 text-[#9aa3af]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[#18181b]">{title}</div>
              <div className="truncate text-[11px] text-[#71717a]">{widget.prompt}</div>
            </div>
            <span className="rounded border border-[#e5e7eb] bg-[#f8fafc] px-2 py-1 text-[11px] font-medium text-[#52525b]">
              {statusLabel}
            </span>
            {widget.status === "error" ? (
              <button
                aria-label="Retry widget"
                className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[#e5e7eb] text-[#52525b] transition hover:bg-[#f6f7f9]"
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
              className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[#e5e7eb] text-[#52525b] transition hover:bg-[#f6f7f9]"
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
            <WidgetBody widget={widget} />
          </div>

          <button
            aria-label="Resize widget"
            className="absolute bottom-1.5 right-1.5 grid h-6 w-6 cursor-nwse-resize place-items-center rounded border border-[#d4d8df] bg-white/90 text-[#71717a] shadow-sm"
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
    </div>
  );
}

export default function Home() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef({
    inside: false,
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
  });
  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const widgetInteractionRef = useRef<WidgetInteraction | null>(null);

  const [zoom, setZoom] = useState(100);
  const [isPanning, setIsPanning] = useState(false);
  const [command, setCommand] = useState<CommandState | null>(null);
  const [widgets, setWidgets] = useState<CanvasWidget[]>([]);
  const [hasHydratedWidgets, setHasHydratedWidgets] = useState(false);

  const scale = zoom / 100;
  const commandPosition = command ? `${command.x}:${command.y}` : null;

  const updateWidget = useCallback((id: string, updater: (widget: CanvasWidget) => CanvasWidget) => {
    setWidgets((current) => current.map((widget) => (widget.id === id ? updater(widget) : widget)));
  }, []);

  const deleteWidget = useCallback((id: string) => {
    setWidgets((current) => current.filter((widget) => widget.id !== id));
  }, []);

  useEffect(() => {
    setWidgets(parseStoredWidgets());
    setHasHydratedWidgets(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedWidgets) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [hasHydratedWidgets, widgets]);

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
        x: Math.min(CANVAS_WIDTH, Math.max(0, x)),
        y: Math.min(CANVAS_HEIGHT, Math.max(0, y)),
      };
    },
    [scale],
  );

  const openCommandAtCursor = useCallback(() => {
    const cursor = cursorRef.current;

    if (!cursor.inside) {
      return;
    }

    setCommand({
      x: cursor.x,
      y: cursor.y,
      value: "",
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      openCommandAtCursor();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openCommandAtCursor]);

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

  const setCanvasZoom = useCallback(
    (nextValue: number, anchor?: { x: number; y: number }) => {
      const nextZoom = clampZoom(nextValue);
      const viewport = viewportRef.current;

      if (!viewport || nextZoom === zoom) {
        setZoom(nextZoom);
        return;
      }

      const currentScale = zoom / 100;
      const nextScale = nextZoom / 100;
      const anchorX = anchor?.x ?? viewport.clientWidth / 2;
      const anchorY = anchor?.y ?? viewport.clientHeight / 2;
      const worldX = (viewport.scrollLeft + anchorX) / currentScale;
      const worldY = (viewport.scrollTop + anchorY) / currentScale;

      setZoom(nextZoom);

      requestAnimationFrame(() => {
        const nextViewport = viewportRef.current;

        if (!nextViewport) {
          return;
        }

        nextViewport.scrollLeft = worldX * nextScale - anchorX;
        nextViewport.scrollTop = worldY * nextScale - anchorY;
      });
    },
    [zoom],
  );

  const canvasStyle = useMemo<CSSProperties>(() => {
    return {
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale,
      backgroundImage:
        "linear-gradient(#edf0f4 1px, transparent 1px), linear-gradient(90deg, #edf0f4 1px, transparent 1px), linear-gradient(#d9dee7 1px, transparent 1px), linear-gradient(90deg, #d9dee7 1px, transparent 1px)",
      backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px, ${GRID_SIZE * scale}px ${GRID_SIZE * scale}px, ${MAJOR_GRID_SIZE * scale}px ${MAJOR_GRID_SIZE * scale}px, ${MAJOR_GRID_SIZE * scale}px ${MAJOR_GRID_SIZE * scale}px`,
      backgroundPosition: "-1px -1px",
    };
  }, [scale]);

  const handleStreamEvent = useCallback(
    (id: string, event: WidgetStreamEvent) => {
      const now = Date.now();

      if (event.type === "exampleData") {
        updateWidget(id, (widget) => ({
          ...widget,
          exampleData: event.data,
          updatedAt: now,
        }));
        return;
      }

      if (event.type === "uiDelta") {
        updateWidget(id, (widget) => ({
          ...widget,
          openuiSource: `${widget.openuiSource}${event.delta}`,
          updatedAt: now,
        }));
        return;
      }

      if (event.type === "error") {
        updateWidget(id, (widget) => ({
          ...widget,
          error: event.error,
          status: "error",
          updatedAt: now,
        }));
        return;
      }

      updateWidget(id, (widget) => ({
        ...widget,
        status: "done",
        updatedAt: now,
      }));
    },
    [updateWidget],
  );

  const generateWidget = useCallback(
    async (id: string, prompt: string) => {
      updateWidget(id, (widget) => ({
        ...widget,
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
            handleStreamEvent(id, event);
          }

          if (done) {
            break;
          }
        }

        if (buffer.trim()) {
          const event = JSON.parse(buffer) as WidgetStreamEvent;
          sawTerminalEvent = event.type === "done" || event.type === "error" || sawTerminalEvent;
          handleStreamEvent(id, event);
        }

        if (!sawTerminalEvent) {
          throw new Error("Generation stopped before the widget finished.");
        }
      } catch (error) {
        updateWidget(id, (widget) => ({
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

      if (!prompt) {
        return;
      }

      const now = Date.now();
      const id = createWidgetId();
      const widget: CanvasWidget = {
        createdAt: now,
        exampleData: null,
        height: DEFAULT_WIDGET_HEIGHT,
        id,
        openuiSource: "",
        prompt,
        status: "streaming",
        updatedAt: now,
        width: DEFAULT_WIDGET_WIDTH,
        x: Math.min(nextCommand.x, CANVAS_WIDTH - DEFAULT_WIDGET_WIDTH),
        y: Math.min(nextCommand.y, CANVAS_HEIGHT - DEFAULT_WIDGET_HEIGHT),
      };

      setWidgets((current) => [...current, widget]);
      setCommand(null);
      void generateWidget(id, prompt);
    },
    [generateWidget],
  );

  const retryWidget = useCallback(
    (widget: CanvasWidget) => {
      void generateWidget(widget.id, widget.prompt);
    },
    [generateWidget],
  );

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (
        (!event.ctrlKey && !event.metaKey) ||
        (event.target instanceof HTMLElement && event.target.closest("[data-widget]"))
      ) {
        return;
      }

      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();
      const direction = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;

      setCanvasZoom(zoom + direction, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [setCanvasZoom, zoom],
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

    if (
      event.target instanceof HTMLElement &&
      event.target.closest("[data-command-input], [data-widget]")
    ) {
      return;
    }

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
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      updateCursorPosition(event);

      const interaction = widgetInteractionRef.current;

      if (interaction) {
        const deltaX = (event.clientX - interaction.startClientX) / scale;
        const deltaY = (event.clientY - interaction.startClientY) / scale;

        if (interaction.type === "drag") {
          updateWidget(interaction.id, (widget) => ({
            ...widget,
            updatedAt: Date.now(),
            x: Math.min(CANVAS_WIDTH - widget.width, Math.max(0, interaction.startX + deltaX)),
            y: Math.min(CANVAS_HEIGHT - widget.height, Math.max(0, interaction.startY + deltaY)),
          }));
        } else {
          updateWidget(interaction.id, (widget) => ({
            ...widget,
            height: Math.min(
              CANVAS_HEIGHT - widget.y,
              Math.max(MIN_WIDGET_HEIGHT, interaction.startHeight + deltaY),
            ),
            updatedAt: Date.now(),
            width: Math.min(
              CANVAS_WIDTH - widget.x,
              Math.max(MIN_WIDGET_WIDTH, interaction.startWidth + deltaX),
            ),
          }));
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
    [scale, updateCursorPosition, updateWidget],
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
    <main className="min-h-screen bg-[#f6f7f9] p-3 text-[#18181b] sm:p-5">
      <section className="relative h-[calc(100vh-1.5rem)] overflow-hidden rounded-lg border border-[#dde1e7] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:h-[calc(100vh-2.5rem)]">
        <div
          ref={viewportRef}
          className={`absolute inset-0 overflow-auto bg-white [scrollbar-gutter:stable] ${
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
                key={widget.id}
                onDelete={deleteWidget}
                onRetry={retryWidget}
                onStartInteraction={startWidgetInteraction}
                scale={scale}
                widget={widget}
              />
            ))}
          </div>

          {command ? (
            <form
              className="absolute z-30 flex h-10 w-[17rem] items-center gap-2 rounded-md border border-[#cfd6e1] bg-white/95 px-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur sm:w-[25rem]"
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
              <span className="select-none text-base font-semibold text-[#697386]">/</span>
              <input
                ref={commandInputRef}
                aria-label="Canvas command"
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-[#18181b] outline-none placeholder:text-[#9aa3af]"
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
                className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[#e5e7eb] text-[#71717a] transition hover:bg-[#f6f7f9]"
                onClick={() => setCommand(null)}
                title="Close"
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]" />

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-[#e2e5ea] bg-white/85 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur sm:left-6 sm:top-6">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          Canvas
          <span className="text-xs font-medium text-[#71717a]">{widgets.length} widgets</span>
        </div>

        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-md border border-[#e2e5ea] bg-white/90 p-1.5 text-sm font-medium shadow-sm backdrop-blur sm:right-6 sm:top-6">
          <button
            aria-label="Zoom out"
            className="grid h-8 w-8 place-items-center rounded border border-[#e2e5ea] bg-white text-base leading-none transition hover:bg-[#f6f7f9] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={zoom === MIN_ZOOM}
            onClick={() => setCanvasZoom(zoom - ZOOM_STEP)}
            type="button"
          >
            -
          </button>

          <input
            aria-label="Zoom level"
            className="h-8 w-24 accent-[#18181b]"
            max={MAX_ZOOM}
            min={MIN_ZOOM}
            onChange={(event) => setCanvasZoom(Number(event.target.value))}
            step={ZOOM_STEP}
            type="range"
            value={zoom}
          />

          <div className="min-w-12 text-center tabular-nums">{zoom}%</div>

          <button
            aria-label="Zoom in"
            className="grid h-8 w-8 place-items-center rounded border border-[#e2e5ea] bg-white text-base leading-none transition hover:bg-[#f6f7f9] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={zoom === MAX_ZOOM}
            onClick={() => setCanvasZoom(zoom + ZOOM_STEP)}
            type="button"
          >
            +
          </button>
        </div>
      </section>
    </main>
  );
}
