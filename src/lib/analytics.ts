"use client";

import * as amplitude from "@amplitude/analytics-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";

let initialized = false;

export type AnalyticsEvent =
  | "board_viewed"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "onboarding_started"
  | "plan_with_ai_completed"
  | "widget_generated"
  | "widget_generation_failed";

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
}

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  if (!initialized) {
    return;
  }

  amplitude.track(event, properties);
}
