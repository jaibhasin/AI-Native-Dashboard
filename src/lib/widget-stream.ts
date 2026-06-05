import type { ExampleWidgetData } from "@/lib/dashboard-schemas";

export type WidgetStreamEvent =
  | {
      type: "exampleData";
      data: ExampleWidgetData;
    }
  | {
      type: "uiDelta";
      delta: string;
    }
  | {
      type: "error";
      error: string;
    }
  | {
      type: "done";
    };
