"use client";

import { Renderer, type OpenUIError } from "@openuidev/react-lang";
import { GripVertical, Maximize2, RotateCcw, Trash2 } from "lucide-react";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  MIN_WIDGET_HEIGHT,
  OPENUI_STAGE_MIN_HEIGHT,
  OPENUI_STAGE_WIDTH,
  WIDGET_AUTHOR_LABEL_HEIGHT,
} from "@/app/_lib/whiteboard/constants";
import {
  hasClosestElement,
  measuredSize,
  parserErrorKey,
  sameSize,
} from "@/app/_lib/whiteboard/geometry";
import type { BoardVisualAccent, ElementSize, WidgetInteraction } from "@/app/_lib/whiteboard/types";
import { DEFAULT_NOTE_AUTHOR_NAME, type CanvasWidget } from "@/lib/dashboard-schemas";
import { dashboardRenderLibrary } from "@/openui/dashboard-render-library";

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

export function WidgetFrame({
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
  const widgetSurfaceHeight = Math.max(MIN_WIDGET_HEIGHT - WIDGET_AUTHOR_LABEL_HEIGHT, widget.height - WIDGET_AUTHOR_LABEL_HEIGHT);
  const statusLabel = widget.status === "streaming" ? "Generating" : widget.status === "error" ? "Error" : null;

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
        className="group"
        style={{
          height: widget.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          willChange: "transform",
          width: widget.width,
        }}
      >
        <div className="mb-1 truncate px-1 text-[10px] font-medium leading-3 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {displayAuthor}
        </div>
        <article
          className="group relative flex overflow-hidden rounded-md border bg-[var(--panel)]"
          style={{
            borderColor: "var(--border-medium)",
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
              <GripVertical className="pointer-events-none h-4 w-4 shrink-0 text-[var(--text-faint)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</div>
                <div className="truncate text-[11px] text-[var(--text-muted)]">{widget.prompt}</div>
              </div>
              {statusLabel ? (
                <span className="rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {statusLabel}
                </span>
              ) : null}
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
                className="pointer-events-none grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] opacity-0 transition hover:bg-[var(--control-hover)] focus:pointer-events-auto focus:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
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
      </div>
    </div>
  );
}
