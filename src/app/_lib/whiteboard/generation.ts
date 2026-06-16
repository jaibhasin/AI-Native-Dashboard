import type { AiBoardBrief, AiBoardPlan } from "@/lib/ai-board-schemas";
import {
  DEFAULT_NOTE_AUTHOR_NAME,
  type CanvasBoard,
  type CanvasNote,
  type CanvasWidget,
} from "@/lib/dashboard-schemas";
import {
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_WIDGET_HEIGHT,
  DEFAULT_WIDGET_WIDTH,
  MAX_NOTE_HEIGHT,
  MAX_NOTE_WIDTH,
  MIN_WIDGET_HEIGHT,
  MIN_WIDGET_WIDTH,
  noteColorOptions,
} from "@/app/_lib/whiteboard/constants";
import type { CommandState } from "@/app/_lib/whiteboard/types";
import {
  clampCanvasRectPosition,
  createBoardId,
  createNoteId,
  createWidgetId,
  noteTextSize,
} from "@/app/_lib/whiteboard/geometry";

export async function readWidgetStream(
  response: Response,
  onEvent: (event: unknown) => void,
) {
  if (!response.ok || !response.body) {
    throw new Error("The widget generation API did not return a stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    buffer += decoder.decode(value, { stream: !done });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      onEvent(JSON.parse(line));
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    onEvent(JSON.parse(buffer));
  }
}

export function createAiBoardArtifacts(plan: AiBoardPlan) {
  const now = Date.now();
  const boardId = createBoardId();
  const notes: CanvasNote[] = plan.notes.map((plannedNote, index) => {
    const fittedSize = noteTextSize(plannedNote.title, plannedNote.body);
    const width = Math.min(
      MAX_NOTE_WIDTH,
      Math.max(DEFAULT_NOTE_WIDTH, plannedNote.width || fittedSize.width, fittedSize.width),
    );
    const height = Math.min(
      MAX_NOTE_HEIGHT,
      Math.max(DEFAULT_NOTE_HEIGHT, plannedNote.height || fittedSize.height, fittedSize.height),
    );
    const position = clampCanvasRectPosition(plannedNote.x, plannedNote.y, width, height);

    return {
      authorName: DEFAULT_NOTE_AUTHOR_NAME,
      body: plannedNote.body,
      color: plannedNote.color,
      createdAt: now + index,
      height,
      id: createNoteId(),
      title: plannedNote.title,
      updatedAt: now + index,
      width,
      ...position,
    };
  });
  const widgets: CanvasWidget[] = plan.widgets.map((plannedWidget, index) => {
    const width = Math.min(560, Math.max(MIN_WIDGET_WIDTH, Math.round(plannedWidget.width)));
    const height = Math.min(420, Math.max(MIN_WIDGET_HEIGHT, Math.round(plannedWidget.height)));
    const position = clampCanvasRectPosition(plannedWidget.x, plannedWidget.y, width, height);

    return {
      authorName: DEFAULT_NOTE_AUTHOR_NAME,
      createdAt: now + index,
      exampleData: null,
      height,
      id: createWidgetId(),
      openuiSource: "",
      prompt: plannedWidget.prompt,
      status: "streaming",
      updatedAt: now + index,
      width,
      ...position,
    };
  });
  const board: CanvasBoard = {
    createdAt: now,
    id: boardId,
    name: plan.boardName.trim().slice(0, 48) || "AI Whiteboard",
    notes,
    updatedAt: now,
    widgets,
  };

  return {
    board,
    widgets,
  };
}

export function trimAiBoardBrief(brief: AiBoardBrief): AiBoardBrief {
  return {
    audience: brief.audience.trim(),
    dataSources: brief.dataSources.trim(),
    metrics: brief.metrics.trim(),
    notes: brief.notes.trim(),
    purpose: brief.purpose.trim(),
    tasks: brief.tasks.trim(),
  };
}

export function createCommandWidget(nextCommand: CommandState) {
  const now = Date.now();
  const id = createWidgetId();
  const position = clampCanvasRectPosition(
    nextCommand.x,
    nextCommand.y,
    DEFAULT_WIDGET_WIDTH,
    DEFAULT_WIDGET_HEIGHT,
  );
  const widget: CanvasWidget = {
    authorName: DEFAULT_NOTE_AUTHOR_NAME,
    createdAt: now,
    exampleData: null,
    height: DEFAULT_WIDGET_HEIGHT,
    id,
    openuiSource: "",
    prompt: nextCommand.value.trim(),
    status: "streaming",
    updatedAt: now,
    width: DEFAULT_WIDGET_WIDTH,
    x: position.x,
    y: position.y,
  };

  return { id, widget };
}

export function nextNoteColor(index: number) {
  return noteColorOptions[index % noteColorOptions.length];
}
