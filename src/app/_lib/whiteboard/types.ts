import type { AiBoardBrief } from "@/lib/ai-board-schemas";

export type ThemeMode = "light" | "dark";
export type AiBoardBriefField = keyof AiBoardBrief;

export type ElementSize = {
  height: number;
  width: number;
};

export type BoardBounds = {
  height: number;
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
  width: number;
};

export type BoardVisualAccent = {
  accent: string;
  border: string;
  canvasMajor: string;
  canvasMinor: string;
  surface: string;
};

export type CommandState = {
  x: number;
  y: number;
  value: string;
};

export type NoteFocusTarget = "body" | "title";

export type WidgetInteraction =
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

export type PendingZoomScroll = {
  anchorX: number;
  anchorY: number;
  worldX: number;
  worldY: number;
};
