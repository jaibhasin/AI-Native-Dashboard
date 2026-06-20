export type OnboardingStep = {
  body: string;
  id: "command" | "prebuilt-tabs" | "plan-with-ai";
  placement: "top" | "bottom";
  target: string;
  title: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "command",
    target: "[data-onboarding-target='canvas-command']",
    title: "Add widgets with /",
    body: "Type a metric or chart right here — like show burn rate and runway. Press Enter to generate a widget on your canvas.",
    placement: "bottom",
  },
  {
    id: "prebuilt-tabs",
    target: "[data-onboarding-target='prebuilt-tabs']",
    title: "Explore examples",
    body: "Prebuilt dashboards for founder, engineering, sales, and ops. Click any tab to browse what's possible.",
    placement: "bottom",
  },
  {
    id: "plan-with-ai",
    target: "[data-onboarding-target='plan-with-ai']",
    title: "Build a full board",
    body: "Describe your goal and AI will plan a whiteboard with widgets and notes.",
    placement: "bottom",
  },
];
