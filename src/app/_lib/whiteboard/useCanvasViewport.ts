"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type WheelEvent } from "react";
import type { CanvasBoard } from "@/lib/dashboard-schemas";
import {
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y,
  TOP_CANVAS_SAFE_INSET,
  ZOOM_SENSITIVITY,
  ZOOM_STEP_FACTOR,
} from "@/app/_lib/whiteboard/constants";
import {
  boardBounds,
  clampCanvasPoint,
  clampZoom,
  fitZoomForBoard,
  isEditableTarget,
} from "@/app/_lib/whiteboard/geometry";
import type { PendingZoomScroll } from "@/app/_lib/whiteboard/types";

export function useCanvasViewport() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(100);
  const pendingZoomScrollRef = useRef<PendingZoomScroll | null>(null);
  const [zoom, setZoom] = useState(100);
  const scale = zoom / 100;

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

  const resetBlankViewport = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    pendingZoomScrollRef.current = null;
    zoomRef.current = 100;
    setZoom(100);
    viewport.scrollLeft = CANVAS_CENTER_X - viewport.clientWidth / 2;
    viewport.scrollTop = CANVAS_CENTER_Y - viewport.clientHeight / 2 - TOP_CANVAS_SAFE_INSET;
  }, []);

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

  const setCanvasZoom = useCallback((nextValue: number, anchor?: { x: number; y: number }) => {
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
  }, []);

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

  return {
    adjustZoom,
    focusBoard,
    getVisibleCanvasCenter,
    handleWheel,
    resetBlankViewport,
    scale,
    viewportRef,
    zoom,
    zoomRef,
  };
}
