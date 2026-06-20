"use client";

import { LoaderCircle, Mic, Square, X } from "lucide-react";
import { useMemo } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useVoiceTranscription } from "@/app/_lib/whiteboard/useVoiceTranscription";
import type { CommandState } from "@/app/_lib/whiteboard/types";

export function CanvasCommand({
  command,
  commandInputRef,
  createWidgetFromCommand,
  onCloseCommand,
  scale,
  setCommand,
}: {
  command: CommandState;
  commandInputRef: RefObject<HTMLInputElement | null>;
  createWidgetFromCommand: (nextCommand: CommandState) => void;
  onCloseCommand: (source: "close_button" | "escape") => void;
  scale: number;
  setCommand: Dispatch<SetStateAction<CommandState | null>>;
}) {
  const { canRecord, cancelRecording, isRecording, isTranscribing, toggleRecording, voiceError } =
    useVoiceTranscription({
      enableKeyboardShortcut: true,
      onTranscript: (nextText) => {
        setCommand((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            value: current.value.trim() ? `${current.value.trim()} ${nextText}` : nextText,
          };
        });
        requestAnimationFrame(() => commandInputRef.current?.focus());
      },
    });
  const voiceStatus = useMemo(() => {
    if (voiceError) {
      return voiceError;
    }

    if (isRecording) {
      return "Recording command audio";
    }

    if (isTranscribing) {
      return "Transcribing command audio";
    }

    return canRecord ? "Ready to record command audio" : "Microphone recording is not available in this browser";
  }, [canRecord, isRecording, isTranscribing, voiceError]);

  return (
    <form
      className="absolute z-30 flex h-10 w-[17rem] items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--panel-translucent-strong)] px-2.5 shadow-[var(--shadow-popover)] backdrop-blur sm:w-[25rem]"
      data-command-input
      data-onboarding-target="canvas-command"
      onSubmit={(event) => {
        event.preventDefault();
        createWidgetFromCommand(command);
      }}
      style={{
        left: command.x * scale + 8,
        top: command.y * scale + 8,
      }}
    >
      <span className="select-none text-base font-semibold text-[var(--text-muted)]">/</span>
      <input
        ref={commandInputRef}
        aria-label="Canvas command"
        className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
        onChange={(event) => {
          setCommand((current) =>
            current
              ? {
                  ...current,
                  value: event.target.value,
                }
              : current,
          );
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCloseCommand("escape");
          }
        }}
        placeholder="show burn rate, top contributors, forecast inputs..."
        value={command.value}
      />
      <button
        aria-label={isRecording ? "Stop recording command" : "Record command with microphone"}
        aria-pressed={isRecording}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded border text-[var(--text-muted)] transition hover:bg-[var(--control-hover)] disabled:cursor-not-allowed disabled:opacity-45 ${
          isRecording
            ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
            : voiceError
              ? "border-red-300 text-red-600"
            : "border-[var(--border)]"
        }`}
        disabled={!canRecord || isTranscribing}
        onClick={() => toggleRecording("mic")}
        title={
          isRecording
            ? "Stop recording"
            : isTranscribing
              ? "Transcribing..."
              : voiceError || "Record command (Cmd/Ctrl+M)"
        }
        type="button"
      >
        {isTranscribing ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : isRecording ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Mic className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        aria-label="Close command"
        className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--control-hover)]"
        onClick={() => {
          cancelRecording();
          onCloseCommand("close_button");
        }}
        title="Close"
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <span className="sr-only" role="status">
        {voiceStatus}
      </span>
    </form>
  );
}
