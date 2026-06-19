import Groq from "groq-sdk";
import {
  chooseGroqKey,
  coolDownGroqKey,
  getApiKeys,
  keyLabel,
  wasRateLimited,
} from "../generate-widget/provider";
import { errorMessage } from "../generate-widget/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_STT_MODEL = "whisper-large-v3-turbo";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

async function transcribeAudio(apiKey: string, audio: File) {
  const client = new Groq({ apiKey, maxRetries: 0 });
  const transcription = await client.audio.transcriptions.create({
    file: audio,
    language: process.env.GROQ_STT_LANGUAGE || "en",
    model: process.env.GROQ_STT_MODEL || DEFAULT_STT_MODEL,
    prompt: "Dashboard command prompt for creating business analytics widgets.",
    response_format: "json",
    temperature: 0,
  });

  return transcription.text.trim();
}

async function transcribeWithGroqFailover(apiKeys: string[], audio: File) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const selected = chooseGroqKey(apiKeys);

    if (!selected) {
      break;
    }

    try {
      return await transcribeAudio(selected.apiKey, audio);
    } catch (error) {
      lastError = error;

      if (wasRateLimited(error)) {
        coolDownGroqKey(selected.apiKey);
      }

      if (attempt < apiKeys.length - 1) {
        console.warn(`${keyLabel(selected.index, apiKeys.length)} failed transcribing audio; trying the next Groq key.`);
      }
    }
  }

  if (lastError && wasRateLimited(lastError)) {
    throw new Error("All configured Groq API keys are currently rate limited. Wait a minute, then retry.");
  }

  if (lastError) {
    throw new Error(`All configured Groq API keys failed while transcribing audio. Last error: ${errorMessage(lastError)}`);
  }

  throw new Error("All configured Groq API keys are cooling down. Wait a minute, then retry.");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return Response.json({ error: "Upload recorded audio as multipart form data." }, { status: 400 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return Response.json({ error: "Record audio before transcribing." }, { status: 400 });
    }

    if (audio.size <= 0) {
      return Response.json({ error: "The recording did not include any audio." }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: "Recordings must be smaller than 25 MB." }, { status: 413 });
    }

    const apiKeys = getApiKeys("groq");

    if (apiKeys.length === 0) {
      return Response.json(
        { error: "Missing GROQ_API_KEY or GROQ_API_KEYS. Add it to your environment and retry." },
        { status: 500 },
      );
    }

    const text = await transcribeWithGroqFailover(apiKeys, audio);

    if (!text) {
      return Response.json({ error: "No speech was detected in the recording." }, { status: 422 });
    }

    return Response.json({ text });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
