"use client";

import { Minus, Moon, Plus, Presentation, Sun } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { ThemeMode } from "@/app/_lib/whiteboard/types";
import { ZOOM_STEP_FACTOR } from "@/app/_lib/whiteboard/constants";
import { trackEvent } from "@/lib/analytics";

export function CanvasOverlays({
  adjustZoom,
  canOpenWidgetFocus,
  canZoomIn,
  canZoomOut,
  isFocusModeActive = false,
  nextTheme,
  onOpenWidgetFocus,
  setTheme,
  theme,
  zoom,
}: {
  adjustZoom: (factor: number) => void;
  canOpenWidgetFocus: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isFocusModeActive?: boolean;
  nextTheme: ThemeMode;
  onOpenWidgetFocus: () => void;
  setTheme: Dispatch<SetStateAction<ThemeMode>>;
  theme: ThemeMode;
  zoom: number;
}) {
  return (
    <>
      <div className="absolute right-4 top-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:top-6">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border-medium)] bg-[var(--panel-translucent)] px-2 py-1 text-sm font-medium shadow-sm backdrop-blur">
          <button
          aria-label={`Switch to ${nextTheme} mode`}
          className="grid h-7 w-7 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)]"
          onClick={() => {
            trackEvent("theme_toggled", { next_theme: nextTheme });
            setTheme(nextTheme);
          }}
          title={`Switch to ${nextTheme} mode`}
          type="button"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        <button
          aria-label="Zoom out"
          className="grid h-7 w-7 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          disabled={!canZoomOut}
          onClick={() => {
            trackEvent("zoom_changed", { direction: "out", source: "button" });
            adjustZoom(1 / ZOOM_STEP_FACTOR);
          }}
          title="Zoom out"
          type="button"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Zoom in"
          className="grid h-7 w-7 place-items-center rounded border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          disabled={!canZoomIn}
          onClick={() => {
            trackEvent("zoom_changed", { direction: "in", source: "button" });
            adjustZoom(ZOOM_STEP_FACTOR);
          }}
          title="Zoom in"
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        </div>
        <div className="group relative -translate-x-[36px] translate-y-1.5">
          <button
            aria-label="Present widgets"
            aria-pressed={isFocusModeActive}
            className={`inline-flex h-7 items-center gap-1 rounded-md border bg-[var(--panel-translucent)] px-2 text-xs font-semibold shadow-sm backdrop-blur transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--panel-translucent)] ${
              isFocusModeActive
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                : "border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]"
            }`}
            disabled={!canOpenWidgetFocus}
            onClick={onOpenWidgetFocus}
            type="button"
          >
            <Presentation className="h-3 w-3 shrink-0" />
            <span>Present</span>
          </button>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-[var(--border-medium)] bg-[var(--panel-translucent-strong)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] opacity-0 shadow-sm backdrop-blur transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            Present widgets
          </span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-4 left-4 z-50 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel-translucent)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] shadow-sm backdrop-blur sm:bottom-6 sm:left-6"
      >
        {isFocusModeActive ? (
          <>
            <span>
              <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">←</span>
              <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">→</span>
              to switch widgets
            </span>
            <span className="h-3 w-px bg-[var(--border-strong)]" />
            <span>
              <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">N</span>
              to add a note
            </span>
          </>
        ) : (
          <>
            <span>
              Press <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">/</span> to create a widget
            </span>
            <span className="h-3 w-px bg-[var(--border-strong)]" />
            <span>
              <span className="mx-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">N</span> to add a note
            </span>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-50 rounded-md border border-[var(--border)] bg-[var(--panel-translucent)] px-2 py-1 text-xs font-medium text-[var(--text-muted)] shadow-sm backdrop-blur sm:bottom-6 sm:right-6">
        {Math.round(zoom)}%
      </div>
    </>
  );
}
