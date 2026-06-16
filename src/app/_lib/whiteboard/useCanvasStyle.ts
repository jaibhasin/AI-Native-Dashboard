"use client";

import { useMemo, type CSSProperties } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH, GRID_SIZE, MAJOR_GRID_SIZE } from "@/app/_lib/whiteboard/constants";
import type { BoardVisualAccent } from "@/app/_lib/whiteboard/types";

export function useCanvasStyle(activeBoardAccent: BoardVisualAccent | null, scale: number) {
  return useMemo<CSSProperties>(() => {
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
}
