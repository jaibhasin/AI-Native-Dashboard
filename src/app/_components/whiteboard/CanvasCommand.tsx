"use client";

import { LoaderCircle, Mic, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { CommandState } from "@/app/_lib/whiteboard/types";

const AUDIO_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];

function recordingMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return AUDIO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function recordingFileName(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "command-recording.mp4";
  }

  if (mimeType.includes("mpeg")) {
    return "command-recording.mp3";
  }

  return "command-recording.webm";
}

export function CanvasCommand({
  command,
  commandInputRef,
  createWidgetFromCommand,
  scale,
  setCommand,
}: {
  command: CommandState;
  commandInputRef: RefObject<HTMLInputElement | null>;
  createWidgetFromCommand: (nextCommand: CommandState) => void;
  scale: number;
  setCommand: Dispatch<SetStateAction<CommandState | null>>;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelRecordingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const canRecord = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
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

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback((cancel = false) => {
    cancelRecordingRef.current = cancel;

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const transcribeRecording = useCallback(
    async (chunks: Blob[], mimeType: string) => {
      const audio = new Blob(chunks, { type: mimeType || "audio/webm" });

      if (audio.size <= 0) {
        setVoiceError("No audio was captured.");
        return;
      }

      setIsTranscribing(true);
      setVoiceError("");

      try {
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();
        const formData = new FormData();
        formData.append("audio", audio, recordingFileName(audio.type));

        const response = await fetch("/api/transcribe-command", {
          body: formData,
          method: "POST",
          signal: abortControllerRef.current.signal,
        });
        const body = (await response.json()) as { error?: string; text?: string };

        if (!response.ok || !body.text) {
          throw new Error(body.error || "Could not transcribe the recording.");
        }

        if (!isMountedRef.current) {
          return;
        }

        setCommand((current) => {
          if (!current) {
            return current;
          }

          const nextText = body.text?.trim();

          if (!nextText) {
            return current;
          }

          return {
            ...current,
            value: current.value.trim() ? `${current.value.trim()} ${nextText}` : nextText,
          };
        });
        requestAnimationFrame(() => commandInputRef.current?.focus());
      } catch (error) {
        if (!isMountedRef.current || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        setVoiceError(error instanceof Error ? error.message : "Could not transcribe the recording.");
      } finally {
        abortControllerRef.current = null;

        if (isMountedRef.current) {
          setIsTranscribing(false);
        }
      }
    },
    [commandInputRef, setCommand],
  );

  const startRecording = useCallback(async () => {
    if (!canRecord || isTranscribing) {
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      setVoiceError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = recordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });
      recorder.addEventListener("stop", () => {
        const chunks = audioChunksRef.current;
        const didCancel = cancelRecordingRef.current;

        recorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecording(false);
        stopStream();

        if (!didCancel) {
          void transcribeRecording(chunks, recorder.mimeType);
        }
      });

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      stopStream();
      setIsRecording(false);
      setVoiceError(error instanceof Error ? error.message : "Microphone access was not available.");
    }
  }, [canRecord, isRecording, isTranscribing, stopRecording, stopStream, transcribeRecording]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      stopRecording(true);
      stopStream();
    };
  }, [stopRecording, stopStream]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "m" || (!event.metaKey && !event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }

      event.preventDefault();
      void startRecording();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [startRecording]);

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
            setCommand(null);
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
        onClick={startRecording}
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
          abortControllerRef.current?.abort();
          stopRecording(true);
          setCommand(null);
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
