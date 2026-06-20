"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

export function AmplitudeProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return null;
}
