"use client";

import * as amplitude from "@amplitude/analytics-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";

let initialized = false;

const pendingEvents: Array<{
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
}> = [];

export type AnalyticsEvent =
  | "board_created"
  | "board_deleted"
  | "board_viewed"
  | "command_closed"
  | "command_opened"
  | "note_created"
  | "note_deleted"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "onboarding_started"
  | "onboarding_step_viewed"
  | "onboarding_welcome_shown"
  | "plan_with_ai_completed"
  | "plan_with_ai_opened"
  | "plan_with_ai_submitted"
  | "session_started"
  | "theme_toggled"
  | "voice_recording_cancelled"
  | "voice_recording_started"
  | "voice_transcription_completed"
  | "voice_transcription_failed"
  | "widget_deleted"
  | "widget_focus_opened"
  | "widget_generated"
  | "widget_generation_failed"
  | "widget_prompt_submitted"
  | "widget_retried"
  | "zoom_changed";

export type AnalyticsProperties = Record<string, string | number | boolean>;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY?.trim();

  if (!apiKey) {
    return;
  }

  amplitude.add(sessionReplayPlugin());
  amplitude.init(apiKey, {
    autocapture: {
      attribution: true,
      elementInteractions: true,
      fileDownloads: true,
      formInteractions: true,
      pageViews: true,
      sessions: true,
    },
    defaultTracking: {
      attribution: true,
      fileDownloads: true,
      formInteractions: true,
      pageViews: true,
      sessions: true,
    },
  });

  initialized = true;

  for (const pending of pendingEvents) {
    amplitude.track(pending.event, pending.properties);
  }

  pendingEvents.length = 0;
}

export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties) {
  if (!initialized) {
    pendingEvents.push({ event, properties });
    return;
  }

  amplitude.track(event, properties);
}

export function promptLength(prompt: string) {
  return prompt.trim().length;
}
