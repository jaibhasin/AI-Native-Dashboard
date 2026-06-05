# Dashboard Canvas

Demo frontend for an AI-native, whiteboard-based dashboard experience built with Next.js, Groq, and OpenUI Lang.

The product idea is simple: dashboards should start from a question, not a chart builder.

Instead of forcing users through fixed dashboard and chart-building flows, the app starts with a blank infinite canvas. Users press `/` anywhere on the canvas, type a natural language prompt, and the app generates a dashboard widget at that position. Widgets can then be arranged freely like blocks on a whiteboard.

This project explores what dashboards could feel like for AI-native startups, where teams need better ways to understand what the AI layer is doing in the background: spend, token waste, failed runs, retries, model usage, oversized context, and operational tradeoffs that are hard to see in traditional BI tools.

The current demo uses mock/demo data for UI prototyping. Each generated widget streams through two stages:

1. Generate realistic preview data for the requested dashboard concept.
2. Generate compact OpenUI Lang that renders the widget with the local component library.

In the current demo, widgets can be generated, dragged, resized, retried, deleted, zoomed, and persisted in browser `localStorage`.

## Example Prompts

- `show our burn rate and runway`
- `compare this month's spend with last month`
- `show AI spend and token waste by workflow`
- `break AI spend down by model`
- `show wasted spend from failed runs, retries, and oversized context`
- `forecast runway if AI spend grows 40% next month`

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- OpenAI and Groq SDKs for generation
- OpenUI Lang for generated widget markup
- Recharts for generated chart components
- Zod for runtime schemas

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create `.env.local` with one or both provider keys:

```bash
# OpenAI is the default provider.
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.5

# Optional Groq fallback/alternate provider.
GROQ_API_KEY=your_groq_api_key
AI_PROVIDER=openai # or groq
```

Optional model overrides:

```bash
OPENAI_MOCK_DATA_MODEL=gpt-5.5
OPENAI_UI_MODEL=gpt-5.5
GROQ_MOCK_DATA_MODEL=openai/gpt-oss-20b
GROQ_UI_MODEL=llama-3.3-70b-versatile
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

- Move the pointer over the canvas and press `/` to open the command input at that location.
- Enter a prompt such as `show our burn rate and runway` or `show AI spend and token waste by workflow`.
- Drag a widget by its header.
- Resize a widget from the bottom-right handle.
- Use the `+` and `-` controls, keyboard shortcuts, or trackpad pinch/zoom gestures to adjust zoom.
- Retry failed widgets from their header control.

Generated values are preview data for UI prototyping. They are not sourced from real business systems.

## Scripts

```bash
pnpm dev
```

Generates the OpenUI prompt bundle and starts the Next.js dev server.

```bash
pnpm build
```

Generates the OpenUI prompt bundle and creates a production build.

```bash
pnpm start
```

Starts the production server after a successful build.

```bash
pnpm lint
```

Runs ESLint.

```bash
pnpm generate:openui-prompt
```

Regenerates `src/generated/openui-dashboard-prompt.txt` from `src/openui/dashboard-prompt-library.ts`.

## Project Structure

```text
src/app/page.tsx                       Canvas UI, widget interactions, streaming client
src/app/api/generate-widget/route.ts   Provider-backed widget generation endpoint
src/lib/dashboard-schemas.ts           Zod schemas and shared widget data types
src/lib/widget-stream.ts               NDJSON stream event types
src/openui/dashboard-render-library.tsx Local OpenUI component library
src/openui/dashboard-prompt-library.ts  Prompt source for OpenUI generation
src/generated/openui-dashboard-prompt.txt Generated prompt bundle used by the API
```

## Generation Flow

1. The client posts `{ prompt }` to `/api/generate-widget`.
2. The API chooses `OPENAI_API_KEY` or `GROQ_API_KEY` from `AI_PROVIDER`.
3. The selected provider generates structured preview data and the API validates it with Zod.
4. The API streams the preview data followed by OpenUI Lang deltas as NDJSON.
5. The client renders OpenUI Lang through `@openuidev/react-lang` using the local component library.

## Notes

- The API route requires the Node.js runtime because it reads the generated OpenUI prompt bundle from disk.
- Interrupted streaming widgets are restored as errors on the next page load so they can be retried.
- Canvas widget state is stored under `new-dashboard.canvas.widgets.v1` in browser `localStorage`.
