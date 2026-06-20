"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { aiBoardPlanSchema, type AiBoardBrief, type AiBoardPlan } from "@/lib/ai-board-schemas";
import { fallbackAiBoardPlan } from "@/lib/ai-board-fallback";
import { BLANK_BOARD_ID } from "@/lib/board-templates";
import type { CanvasBoard, CanvasWidget } from "@/lib/dashboard-schemas";
import { createAiBoardArtifacts, trimAiBoardBrief } from "@/app/_lib/whiteboard/generation";
import { createBoardId } from "@/app/_lib/whiteboard/geometry";
import type { AiBoardBriefField, CommandState } from "@/app/_lib/whiteboard/types";

function emptyAiBoardBrief(): AiBoardBrief {
  return {
    audience: "",
    dataSources: "",
    metrics: "",
    notes: "",
    purpose: "",
    tasks: "",
  };
}

type GenerateAiBoardWidgets = (boardId: string, plannedWidgets: CanvasWidget[]) => Promise<void>;

export function useBoardCreation({
  activeBoardId,
  boards,
  focusBoard,
  generateAiBoardWidgets,
  setActiveBoardId,
  setBoards,
  setCommand,
  stopEditingNote,
}: {
  activeBoardId: string;
  boards: CanvasBoard[];
  focusBoard: (board: CanvasBoard | undefined) => void;
  generateAiBoardWidgets: GenerateAiBoardWidgets;
  setActiveBoardId: (boardId: string) => void;
  setBoards: Dispatch<SetStateAction<CanvasBoard[]>>;
  setCommand: Dispatch<SetStateAction<CommandState | null>>;
  stopEditingNote: () => void;
}) {
  const boardNameInputRef = useRef<HTMLInputElement>(null);
  const aiBoardPurposeInputRef = useRef<HTMLTextAreaElement>(null);
  const [isCreatingBoardName, setIsCreatingBoardName] = useState(false);
  const [isCreatingAiBoard, setIsCreatingAiBoard] = useState(false);
  const [isGeneratingAiBoard, setIsGeneratingAiBoard] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState("");
  const [aiBoardBrief, setAiBoardBrief] = useState<AiBoardBrief>(() => emptyAiBoardBrief());
  const [aiBoardError, setAiBoardError] = useState<string | null>(null);

  const deleteBoard = useCallback(
    (boardId: string) => {
      const personalBoardsAfterDelete = boards.filter((board) => !board.templateId && board.id !== boardId);
      const fallbackBoard = personalBoardsAfterDelete[0] ?? boards.find((board) => board.id !== boardId);

      setBoards((current) => {
        const boardToDelete = current.find((board) => board.id === boardId);
        const personalBoardCount = current.filter((board) => !board.templateId).length;

        if (!boardToDelete || boardToDelete.templateId || boardToDelete.id === BLANK_BOARD_ID || personalBoardCount <= 1) {
          return current;
        }

        return current.filter((board) => board.id !== boardId);
      });

      if (activeBoardId === boardId) {
        setActiveBoardId(fallbackBoard?.id ?? BLANK_BOARD_ID);
        setCommand(null);
        stopEditingNote();
        requestAnimationFrame(() => focusBoard(fallbackBoard));
      }
    },
    [activeBoardId, boards, focusBoard, setActiveBoardId, setBoards, setCommand, stopEditingNote],
  );

  const selectBoard = useCallback(
    (boardId: string) => {
      setActiveBoardId(boardId);
      setIsCreatingBoardName(false);
      setBoardNameDraft("");
      setCommand(null);
      stopEditingNote();

      requestAnimationFrame(() => {
        focusBoard(boards.find((board) => board.id === boardId));
      });
    },
    [boards, focusBoard, setActiveBoardId, setCommand, stopEditingNote],
  );

  const openBoardNameCreate = useCallback(() => {
    setIsCreatingBoardName(true);
    setBoardNameDraft("");
    setCommand(null);
    stopEditingNote();
  }, [setCommand, stopEditingNote]);

  const cancelBoardNameCreate = useCallback(() => {
    setIsCreatingBoardName(false);
    setBoardNameDraft("");
  }, []);

  const openAiBoardCreate = useCallback(() => {
    setIsCreatingAiBoard(true);
    setIsCreatingBoardName(false);
    setAiBoardError(null);
    setCommand(null);
    stopEditingNote();
  }, [setCommand, stopEditingNote]);

  const closeAiBoardCreate = useCallback(() => {
    if (isGeneratingAiBoard) {
      return;
    }

    setIsCreatingAiBoard(false);
    setAiBoardError(null);
  }, [isGeneratingAiBoard]);

  const updateAiBoardBrief = useCallback((field: AiBoardBriefField, value: string) => {
    setAiBoardBrief((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "purpose") {
      setAiBoardError(null);
    }
  }, []);

  const createNamedBlankBoard = useCallback(() => {
    const nextName = boardNameDraft.trim().slice(0, 48);

    if (!nextName) {
      return;
    }

    const now = Date.now();
    const board: CanvasBoard = {
      createdAt: now,
      id: createBoardId(),
      name: nextName,
      notes: [],
      updatedAt: now,
      widgets: [],
    };

    setBoards((current) => [...current, board]);
    setActiveBoardId(board.id);
    setIsCreatingBoardName(false);
    setBoardNameDraft("");
    setCommand(null);
    stopEditingNote();

    requestAnimationFrame(() => focusBoard(board));
  }, [boardNameDraft, focusBoard, setActiveBoardId, setBoards, setCommand, stopEditingNote]);

  const createAiBoardFromPlan = useCallback(
    (plan: AiBoardPlan) => {
      const { board, widgets } = createAiBoardArtifacts(plan);

      setBoards((current) => [...current, board]);
      setActiveBoardId(board.id);
      setIsCreatingAiBoard(false);
      setAiBoardError(null);
      setAiBoardBrief(emptyAiBoardBrief());
      setCommand(null);
      stopEditingNote();

      requestAnimationFrame(() => focusBoard(board));
      void generateAiBoardWidgets(board.id, widgets);
    },
    [focusBoard, generateAiBoardWidgets, setActiveBoardId, setBoards, setCommand, stopEditingNote],
  );

  const createBoardWithAi = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const brief = trimAiBoardBrief(aiBoardBrief);

      if (!brief.purpose) {
        setAiBoardError("Describe what this whiteboard is for.");
        aiBoardPurposeInputRef.current?.focus();
        return;
      }

      setIsGeneratingAiBoard(true);
      setAiBoardError(null);

      try {
        const response = await fetch("/api/generate-board", {
          body: JSON.stringify(brief),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const body = (await response.json().catch(() => null)) as unknown;

        if (!response.ok) {
          const error =
            body && typeof body === "object" && "error" in body && typeof body.error === "string"
              ? body.error
              : "Board generation failed.";

          throw new Error(error);
        }

        const parsedPlan = aiBoardPlanSchema.safeParse(body);

        if (parsedPlan.success) {
          createAiBoardFromPlan(parsedPlan.data);
          return;
        }

        console.warn("AI board API returned an unusable plan; using fallback plan.", parsedPlan.error);
        createAiBoardFromPlan(fallbackAiBoardPlan(brief));
      } catch (error) {
        console.warn("AI board planning failed; using fallback plan.", error);
        createAiBoardFromPlan(fallbackAiBoardPlan(brief));
      } finally {
        setIsGeneratingAiBoard(false);
      }
    },
    [aiBoardBrief, createAiBoardFromPlan],
  );

  useEffect(() => {
    if (!isCreatingBoardName) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      boardNameInputRef.current?.focus();
      boardNameInputRef.current?.select();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isCreatingBoardName]);

  useEffect(() => {
    if (!isCreatingAiBoard) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      aiBoardPurposeInputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isCreatingAiBoard]);

  return {
    aiBoardBrief,
    aiBoardError,
    aiBoardPurposeInputRef,
    boardNameDraft,
    boardNameInputRef,
    cancelBoardNameCreate,
    closeAiBoardCreate,
    createBoardWithAi,
    createNamedBlankBoard,
    deleteBoard,
    isCreatingAiBoard,
    isCreatingBoardName,
    isGeneratingAiBoard,
    openAiBoardCreate,
    openBoardNameCreate,
    selectBoard,
    setBoardNameDraft,
    updateAiBoardBrief,
  };
}
