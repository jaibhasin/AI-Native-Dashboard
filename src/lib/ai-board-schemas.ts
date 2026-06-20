import { z } from "zod/v4";
import { canvasNoteColorSchema, exampleWidgetDataSchema } from "@/lib/dashboard-schemas";

const optionalBriefTextSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().max(1600),
);

export const aiBoardBriefSchema = z.object({
  purpose: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1).max(1600),
  ),
  audience: optionalBriefTextSchema,
  tasks: optionalBriefTextSchema,
  metrics: optionalBriefTextSchema,
  dataSources: optionalBriefTextSchema,
  notes: optionalBriefTextSchema,
});

export const aiBoardWidgetPlanSchema = z.object({
  prompt: z.string().min(8).max(360),
  exampleData: exampleWidgetDataSchema.optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const aiBoardNotePlanSchema = z.object({
  title: z.string().max(48),
  body: z.string().max(280),
  color: canvasNoteColorSchema,
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const aiBoardPlanSchema = z.object({
  boardName: z.string().min(1).max(48),
  widgets: z.array(aiBoardWidgetPlanSchema).min(8).max(12),
  notes: z.array(aiBoardNotePlanSchema).max(6),
});

export type AiBoardBrief = z.infer<typeof aiBoardBriefSchema>;
export type AiBoardWidgetPlan = z.infer<typeof aiBoardWidgetPlanSchema>;
export type AiBoardNotePlan = z.infer<typeof aiBoardNotePlanSchema>;
export type AiBoardPlan = z.infer<typeof aiBoardPlanSchema>;
