import { ZodError, z } from "zod/v4";

export const aiProviderSchema = z.enum(["groq", "openrouter"]);

export type AIProvider = z.infer<typeof aiProviderSchema>;

export function errorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return "The generated preview data was not usable. Please retry the widget.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected generation error.";
}

export function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

export function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const compactMatch = value.replace(/[$,%\s,]/g, "").match(/^-?\d+(?:\.\d+)?$/);
    const parsed = compactMatch ? Number(compactMatch[0]) : Number.NaN;

    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const magnitudeMatch = value.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)(?:\s*([kmb])(?=$|[^a-z]))?/i);

    if (magnitudeMatch) {
      const amount = Number(magnitudeMatch[1]);
      const suffix = magnitudeMatch[2]?.toLowerCase();
      const multiplier = suffix === "b" ? 1_000_000_000 : suffix === "m" ? 1_000_000 : suffix === "k" ? 1_000 : 1;

      if (Number.isFinite(amount)) {
        return amount * multiplier;
      }
    }
  }

  return null;
}
