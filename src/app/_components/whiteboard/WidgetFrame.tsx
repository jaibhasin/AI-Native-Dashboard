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
    <div className="flex h-full flex-col gap-2 bg-[var(--surface)] p-2">
      <div className="grid grid-cols-2 gap-1.5">
        {widget.exampleData?.metrics.slice(0, 4).map((metric, index) => (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--widget-block-bg)] px-2 py-1.5" key={`${metric.label}-${index}`}>
            <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-1.5 h-5 w-20 animate-pulse rounded bg-[var(--surface-subtle)]" />
          </div>
        )) ?? (
          <>
            <div className="h-14 animate-pulse rounded-lg bg-[var(--surface-subtle)]" />
            <div className="h-14 animate-pulse rounded-lg bg-[var(--surface-subtle)]" />
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 animate-pulse rounded-lg bg-[var(--widget-block-bg)]" />
      <div className="text-[10px] font-medium text-[var(--text-muted)]">
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
    <div ref={bodyRef} className="relative h-full overflow-hidden bg-[var(--surface)]" data-openui-fit-body>
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
  const subtitle = widget.exampleData?.subtitle?.trim();
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
          className="group relative flex overflow-hidden rounded-xl border bg-[var(--panel)] shadow-[var(--shadow-widget)]"
          style={{
            borderColor: accent?.border ?? "var(--border-medium)",
            boxShadow: accent ? "var(--shadow-widget-accent)" : "var(--shadow-widget)",
            height: widgetSurfaceHeight,
            width: widget.width,
          }}
        >
          <div className="flex min-h-0 w-full flex-col">
            {accent ? (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
                style={{ background: accent.accent }}
              />
            ) : null}
            <header
              className="flex h-8 shrink-0 cursor-grab items-center gap-1.5 border-b border-[var(--border-soft)] bg-[var(--panel)] pl-2 pr-1.5 active:cursor-grabbing"
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
                background: accent
                  ? `linear-gradient(90deg, ${accent.surface}, var(--panel) 72%)`
                  : undefined,
              }}
            >
              <GripVertical className="pointer-events-none h-3.5 w-3.5 shrink-0 text-[var(--text-faint)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100" />
              <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <div className="truncate text-[13px] font-semibold leading-none text-[var(--text-primary)]">{title}</div>
                {subtitle ? (
                  <div className="truncate text-[11px] leading-none text-[var(--text-muted)]">· {subtitle}</div>
                ) : null}
              </div>
              {statusLabel ? (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                  {statusLabel}
                </span>
              ) : null}
              {widget.status === "error" ? (
                <button
                  aria-label="Retry widget"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)]"
                  data-widget-control
                  onClick={(event) => {
                    event.stopPropagation();
                    onRetry(widget);
                  }}
                  title="Retry"
                  type="button"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              ) : null}
              <button
                aria-label="Delete widget"
                className="pointer-events-none grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] opacity-0 transition hover:bg-[var(--control-hover)] focus:pointer-events-auto focus:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                data-widget-control
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(widget.id);
                }}
                title="Delete"
                type="button"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden">
              <WidgetBody
                alignContentToTop
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
