import type { CanvasNoteColor } from "@/lib/dashboard-schemas";

export const LEGACY_CANVAS_WIDTH = 3600;
export const LEGACY_CANVAS_HEIGHT = 2400;
export const CANVAS_WIDTH = 200000;
export const CANVAS_HEIGHT = 200000;
export const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
export const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;
export const GRID_SIZE = 24;
export const MAJOR_GRID_SIZE = 120;
export const MIN_ZOOM = 20;
export const MAX_ZOOM = 200;
export const ZOOM_STEP_FACTOR = 1.12;
export const ZOOM_SENSITIVITY = 0.0015;
export const DEFAULT_WIDGET_WIDTH = 440;
export const DEFAULT_WIDGET_HEIGHT = 320;
export const DEFAULT_NOTE_WIDTH = 180;
export const DEFAULT_NOTE_HEIGHT = 78;
export const MAX_NOTE_WIDTH = 440;
export const MAX_NOTE_HEIGHT = 320;
export const NOTE_HORIZONTAL_CHROME = 36;
export const NOTE_VERTICAL_CHROME = 58;
export const NOTE_AUTHOR_LABEL_HEIGHT = 18;
export const NOTE_BODY_CHAR_WIDTH = 7;
export const NOTE_BODY_LINE_HEIGHT = 20;
export const TOP_CANVAS_SAFE_INSET = 180;
export const WIDGET_HEADER_HEIGHT = 32;
export const WIDGET_AUTHOR_LABEL_HEIGHT = 18;
export const OPENUI_STAGE_WIDTH = DEFAULT_WIDGET_WIDTH;
export const OPENUI_STAGE_MIN_HEIGHT = 280;
export const MIN_WIDGET_WIDTH = 280;
export const MIN_WIDGET_HEIGHT = 200;
export const LEGACY_WIDGET_STORAGE_KEY = "new-dashboard.canvas.widgets.v1";
export const BOARD_STORAGE_KEY = "new-dashboard.canvas.boards.v1";
export const ONBOARDING_STORAGE_KEY = "new-dashboard.onboarding.v1";
export const THEME_STORAGE_KEY = "new-dashboard.theme.preference.v1";
export const BOARD_TAB_SCROLL_EPSILON = 1;
export const AI_BOARD_WIDGET_CONCURRENCY = 2;
export const AI_BOARD_WIDGET_QUEUE_STAGGER_MS = 650;

export const noteColorStyles: Record<
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

export const noteColorOptions: CanvasNoteColor[] = ["blue", "green", "amber", "rose"];
export const noteColorLabels: Record<CanvasNoteColor, string> = {
  amber: "amber",
  blue: "blue",
  green: "green",
  rose: "neutral",
};
