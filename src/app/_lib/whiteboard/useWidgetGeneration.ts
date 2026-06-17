"use client";

import { useCallback } from "react";
import type { CanvasWidget, ExampleWidgetData } from "@/lib/dashboard-schemas";
import type { WidgetStreamEvent } from "@/lib/widget-stream";
import { openuiSourceForData } from "@/lib/board-template-core";
import {
  AI_BOARD_WIDGET_CONCURRENCY,
  AI_BOARD_WIDGET_QUEUE_STAGGER_MS,
} from "@/app/_lib/whiteboard/constants";
import { readWidgetStream } from "@/app/_lib/whiteboard/generation";
import { streamErrorMessage } from "@/app/_lib/whiteboard/geometry";

type UpdateWidget = (boardId: string, id: string, updater: (widget: CanvasWidget) => CanvasWidget) => void;

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function canUseLocalRenderFallback(error: string) {
  return /rate limit|rate limited|cooling down|cooldown/i.test(error);
}

export function useWidgetGeneration(updateWidget: UpdateWidget) {
  const handleStreamEvent = useCallback(
    (boardId: string, id: string, event: WidgetStreamEvent, fallbackExampleData?: ExampleWidgetData | null) => {
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
        if (fallbackExampleData && canUseLocalRenderFallback(event.error)) {
          updateWidget(boardId, id, (widget) => ({
            ...widget,
            error: undefined,
            exampleData: fallbackExampleData,
            openuiSource: openuiSourceForData(fallbackExampleData),
            status: "done",
            updatedAt: now,
          }));
          return;
        }

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
    async (boardId: string, id: string, prompt: string, providedExampleData?: ExampleWidgetData | null) => {
      const exampleData = providedExampleData ?? null;

      updateWidget(boardId, id, (widget) => ({
        ...widget,
        contentFitKey: undefined,
        error: undefined,
        exampleData,
        openuiSource: "",
        status: "streaming",
        updatedAt: Date.now(),
      }));

      let sawTerminalEvent = false;

      try {
        const response = await fetch("/api/generate-widget", {
          body: JSON.stringify(exampleData ? { exampleData, prompt } : { prompt }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        await readWidgetStream(response, (parsedEvent) => {
          const event = parsedEvent as WidgetStreamEvent;
          sawTerminalEvent = event.type === "done" || event.type === "error" || sawTerminalEvent;
          handleStreamEvent(boardId, id, event, exampleData);
        });

        if (!sawTerminalEvent) {
          throw new Error("Generation stopped before the widget finished.");
        }
      } catch (error) {
        const errorText = streamErrorMessage(error);

        if (exampleData && canUseLocalRenderFallback(errorText)) {
          updateWidget(boardId, id, (widget) => ({
            ...widget,
            error: undefined,
            exampleData,
            openuiSource: openuiSourceForData(exampleData),
            status: "done",
            updatedAt: Date.now(),
          }));
          return;
        }

        updateWidget(boardId, id, (widget) => ({
          ...widget,
          error: errorText,
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
        Array.from({ length: workerCount }, async (_, workerIndex) => {
          if (workerIndex > 0) {
            await wait(workerIndex * AI_BOARD_WIDGET_QUEUE_STAGGER_MS);
          }

          while (nextIndex < plannedWidgets.length) {
            const widget = plannedWidgets[nextIndex];
            nextIndex += 1;
            await generateWidget(boardId, widget.id, widget.prompt, widget.exampleData);
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
