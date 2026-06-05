"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type WheelEvent,
} from "react";

const CANVAS_WIDTH = 3600;
const CANVAS_HEIGHT = 2400;
const GRID_SIZE = 24;
const MAJOR_GRID_SIZE = 120;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export default function Home() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const [zoom, setZoom] = useState(100);
  const [isPanning, setIsPanning] = useState(false);

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
    const scale = zoom / 100;

    return {
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale,
      backgroundImage:
        "linear-gradient(#edf0f4 1px, transparent 1px), linear-gradient(90deg, #edf0f4 1px, transparent 1px), linear-gradient(#d9dee7 1px, transparent 1px), linear-gradient(90deg, #d9dee7 1px, transparent 1px)",
      backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px, ${GRID_SIZE * scale}px ${GRID_SIZE * scale}px, ${MAJOR_GRID_SIZE * scale}px ${MAJOR_GRID_SIZE * scale}px, ${MAJOR_GRID_SIZE * scale}px ${MAJOR_GRID_SIZE * scale}px`,
      backgroundPosition: "-1px -1px",
    };
  }, [zoom]);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && !event.metaKey) {
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

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
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

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const pan = panRef.current;

    if (!viewport || !pan.active) {
      return;
    }

    viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
    viewport.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
  }, []);

  const endPan = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;

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
          onPointerCancel={endPan}
          onPointerDown={handlePointerDown}
          onPointerLeave={endPan}
          onPointerMove={handlePointerMove}
          onPointerUp={endPan}
          onWheel={handleWheel}
        >
          <div aria-label="Scrollable grid canvas" style={canvasStyle} />
        </div>

        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]" />

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-[#e2e5ea] bg-white/85 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur sm:left-6 sm:top-6">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          Canvas
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
