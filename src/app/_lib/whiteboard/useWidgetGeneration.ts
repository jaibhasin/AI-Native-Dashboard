"use client";

import { useCallback } from "react";
import type { CanvasWidget } from "@/lib/dashboard-schemas";
import type { WidgetStreamEvent } from "@/lib/widget-stream";
import { AI_BOARD_WIDGET_CONCURRENCY } from "@/app/_lib/whiteboard/constants";
import { readWidgetStream } from "@/app/_lib/whiteboard/generation";
import { streamErrorMessage } from "@/app/_lib/whiteboard/geometry";

type UpdateWidget = (boardId: string, id: string, updater: (widget: CanvasWidget) => CanvasWidget) => void;

export function useWidgetGeneration(updateWidget: UpdateWidget) {
  const handleStreamEvent = useCallback(
    (boardId: string, id: string, event: WidgetStreamEvent) => {
      const now = Date.now();

      if (event.type === "exampleData") {
        updateWidget(boardId, id, (widget) => ({
          ...widget,
          exampleData: event.data,
          updatedAt: now,
        }));
        return;
      }

      if (event.type === "uiDelta") {
        updateWidget(boardId, id, (widget) => ({
          ...widget,
          openuiSource: `${widget.openuiSource}${event.delta}`,
          updatedAt: now,
        }));
        return;
      }

      if (event.type === "error") {
        updateWidget(boardId, id, (widget) => ({
          ...widget,
          error: event.error,
          status: "error",
          updatedAt: now,
        }));
        return;
      }

      updateWidget(boardId, id, (widget) => ({
        ...widget,
        status: "done",
        updatedAt: now,
      }));
    },
    [updateWidget],
  );

  const generateWidget = useCallback(
    async (boardId: string, id: string, prompt: string) => {
      updateWidget(boardId, id, (widget) => ({
        ...widget,
        contentFitKey: undefined,
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

        await readWidgetStream(response, (parsedEvent) => {
          const event = parsedEvent as WidgetStreamEvent;
          sawTerminalEvent = event.type === "done" || event.type === "error" || sawTerminalEvent;
          handleStreamEvent(boardId, id, event);
        });

        if (!sawTerminalEvent) {
          throw new Error("Generation stopped before the widget finished.");
        }
      } catch (error) {
        updateWidget(boardId, id, (widget) => ({
          ...widget,
          error: streamErrorMessage(error),
          status: "error",
          updatedAt: Date.now(),
        }));
      }
    },
    [handleStreamEvent, updateWidget],
  );

  const generateAiBoardWidgets = useCallback(
    async (boardId: string, plannedWidgets: CanvasWidget[]) => {
      let nextIndex = 0;
      const workerCount = Math.min(AI_BOARD_WIDGET_CONCURRENCY, plannedWidgets.length);

      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (nextIndex < plannedWidgets.length) {
            const widget = plannedWidgets[nextIndex];
            nextIndex += 1;
            await generateWidget(boardId, widget.id, widget.prompt);
          }
        }),
      );
    },
    [generateWidget],
  );

  return {
    generateAiBoardWidgets,
    generateWidget,
  };
}
