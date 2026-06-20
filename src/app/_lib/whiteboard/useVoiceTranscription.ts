"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

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

export function useVoiceTranscription({
  disabled = false,
  enableKeyboardShortcut = false,
  onTranscript,
}: {
  disabled?: boolean;
  enableKeyboardShortcut?: boolean;
  onTranscript: (text: string) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelRecordingRef = useRef(false);
  const isMountedRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const canRecord = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

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

  const transcribeRecording = useCallback(async (chunks: Blob[], mimeType: string) => {
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

      const nextText = body.text.trim();

      trackEvent("voice_transcription_completed", {
        transcript_length: nextText.length,
      });

      if (nextText) {
        onTranscriptRef.current(nextText);
      }
    } catch (error) {
      if (!isMountedRef.current || (error instanceof DOMException && error.name === "AbortError")) {
        return;
      }

      setVoiceError(error instanceof Error ? error.message : "Could not transcribe the recording.");
      trackEvent("voice_transcription_failed", {
        error: (error instanceof Error ? error.message : "unknown").slice(0, 120),
      });
    } finally {
      abortControllerRef.current = null;

      if (isMountedRef.current) {
        setIsTranscribing(false);
      }
    }
  }, []);

  const startRecording = useCallback(
    async (source: "keyboard" | "mic") => {
      if (disabled || !canRecord || isTranscribing) {
        return;
      }

      if (isRecording) {
        stopRecording();
        return;
      }

      try {
        setVoiceError("");
        trackEvent("voice_recording_started", { source });
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
          } else {
            trackEvent("voice_recording_cancelled");
          }
        });

        recorder.start();
        setIsRecording(true);
      } catch (error) {
        stopStream();
        setIsRecording(false);
        setVoiceError(error instanceof Error ? error.message : "Microphone access was not available.");
      }
    },
    [canRecord, disabled, isRecording, isTranscribing, stopRecording, stopStream, transcribeRecording],
  );

  const toggleRecording = useCallback(
    (source: "keyboard" | "mic" = "mic") => {
      void startRecording(source);
    },
    [startRecording],
  );

  const cancelRecording = useCallback(() => {
    abortControllerRef.current?.abort();
    stopRecording(true);
  }, [stopRecording]);

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
    if (!enableKeyboardShortcut) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "m" || (!event.metaKey && !event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }

      event.preventDefault();
      void startRecording("keyboard");
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enableKeyboardShortcut, startRecording]);

  return {
    canRecord,
    cancelRecording,
    isRecording,
    isTranscribing,
    toggleRecording,
    voiceError,
  };
}
