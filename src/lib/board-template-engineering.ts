import generatedTemplate from "@/generated/board-templates/engineering.generated.json";
import {
  BOARD_TEMPLATE_VERSION,
  type BoardTemplate,
} from "@/lib/board-template-core";
import { exampleWidgetDataSchema } from "@/lib/dashboard-schemas";
import { z } from "zod/v4";

const generatedBoardTemplateSchema = z.object({
  generatedAt: z.string().optional(),
  id: z.literal("engineering"),
  name: z.string(),
  notes: z.array(
    z.object({
      authorName: z.string(),
      body: z.string(),
      color: z.enum(["blue", "green", "amber", "rose"]),
      height: z.number(),
      id: z.string(),
      title: z.string(),
      widgetId: z.string().optional(),
      width: z.number(),
      x: z.number(),
      y: z.number(),
    }),
  ),
  templateVersion: z.number().optional(),
  widgets: z.array(
    z.object({
      authorName: z.string(),
      exampleData: exampleWidgetDataSchema,
      height: z.number(),
      id: z.string(),
      openuiSource: z.string().min(1),
      prompt: z.string(),
      width: z.number(),
      x: z.number(),
      y: z.number(),
    }),
  ),
});

function loadEngineeringBoardTemplate(): BoardTemplate {
  const parsed = generatedBoardTemplateSchema.safeParse(generatedTemplate);

  if (!parsed.success) {
    throw new Error(
      "Invalid generated Engineering board at src/generated/board-templates/engineering.generated.json. Run pnpm generate:engineering-board.",
    );
  }

  if (parsed.data.templateVersion && parsed.data.templateVersion !== BOARD_TEMPLATE_VERSION) {
    throw new Error(
      `Generated Engineering board version ${parsed.data.templateVersion} does not match BOARD_TEMPLATE_VERSION ${BOARD_TEMPLATE_VERSION}. Run pnpm generate:engineering-board.`,
    );
  }

  return parsed.data;
}

export const engineeringBoardTemplate = loadEngineeringBoardTemplate();
