# AI Native Dashboard

Build AI dashboards by asking questions on an infinite canvas.

AI Native Dashboard is an OpenUI-powered prototype for creating operating dashboards from natural language. Instead of starting with a chart builder, the app starts with a blank canvas. Press `/`, ask for the metric or view you want, and the app generates a movable dashboard widget in that spot.

The demo focuses on AI-heavy teams that need to understand where money and time are going: model spend, token waste, failed runs, retries, oversized context, agent quality, and runway impact.

## Highlights

- Natural-language widget generation from anywhere on the canvas
- OpenUI Lang rendering through a local React component library
- Streaming generation flow with preview data followed by generated UI
- Drag, resize, retry, delete, zoom, and persist widgets locally
- AI operations dashboard examples for spend, token waste, model usage, runway, and workflow quality
- Groq-first server route with optional multi-key failover for deployed demos

## Demo

Watch the demo video: [Loom walkthrough](https://www.loom.com/share/f4ab2c786f774835a6d59339d8baf712)

## How It Works

The current demo uses mock/demo data for UI prototyping. Each generated widget streams through two stages:

1. Generate realistic preview data for the requested dashboard concept.
2. Generate compact OpenUI Lang that renders the widget with the local component library.

In the current demo, widgets can be generated, dragged, resized, retried, deleted, zoomed, and persisted in browser `localStorage`.

Generated values are preview data for UI prototyping. They are not sourced from real business systems.

## Example Prompts

- `show our burn rate and runway`
- `compare this month's spend with last month`
- `show AI spend and token waste by workflow`
- `break AI spend down by model`
- `show wasted spend from failed runs, retries, and oversized context`
- `forecast runway if AI spend grows 40% next month`

## Product Direction

The prototype becomes more valuable when it moves from generated preview data to real operating data. High-leverage next steps:

- Connect real AI-layer sources such as OpenAI, Anthropic, Groq, Langfuse, Helicone, Vercel AI SDK logs, or internal agent traces.
- Define a canonical AI operations event schema for model calls, workflow runs, retries, failures, evals, human escalations, and cost.
- Add opinionated AI-native metrics: cost per workflow, retry waste, failed-run rate, context efficiency, model ROI, human escalation rate, and runway impact.
- Let users ask questions that combine AI activity with business data from Stripe, QuickBooks, GitHub, Linear, or CRM systems.
- Move from passive widgets to recommended actions, such as changing a model, capping context, adding an eval, or routing failed runs to a human.

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

Prerequisites:

- Node.js 20+
- pnpm
- A Groq API key, or an OpenAI API key if using the optional OpenAI provider

Install dependencies:

```bash
pnpm install
```

Create `.env.local` with one or both provider keys:

```bash
# Groq is the default provider.
GROQ_API_KEY=your_groq_api_key
AI_PROVIDER=groq # optional; groq is used when AI_PROVIDER is unset

# Optional Groq failover pool for deployed demos.
# Keep these server-side only. The app rotates to another key when a key returns 429.
GROQ_API_KEYS=groq_key_1,groq_key_2,groq_key_3

# Optional OpenAI alternate provider.
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.5
# AI_PROVIDER=openai
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

## Deploy

Vercel is the simplest deployment target because the app uses a Next.js server route at `/api/generate-widget`.

Set these environment variables in Vercel:

```bash
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
```

For showcase demos, you can provide a small server-side key pool. The app rotates to another key when Groq returns a rate-limit response:

```bash
AI_PROVIDER=groq
GROQ_API_KEYS=groq_key_1,groq_key_2,groq_key_3
```

Do not expose provider keys in the browser or commit `.env` files.

## Usage

- Move the pointer over the canvas and press `/` to open the command input at that location.
- Enter a prompt such as `show our burn rate and runway` or `show AI spend and token waste by workflow`.
- Drag a widget by its header.
- Resize a widget from the bottom-right handle.
- Use the `+` and `-` controls, keyboard shortcuts, or trackpad pinch/zoom gestures to adjust zoom.
- Retry failed widgets from their header control.

## Maintainer

Built and maintained by Jai Bhasin.

Contact: [bhasinjai@gmail.com](mailto:bhasinjai@gmail.com)

## License

Apache License 2.0. See [LICENSE](LICENSE).

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
2. The API chooses `GROQ_API_KEYS` or `GROQ_API_KEY` by default, or `OPENAI_API_KEY` when `AI_PROVIDER=openai`.
3. The selected provider generates structured preview data and the API validates it with Zod.
4. The API streams the preview data followed by OpenUI Lang deltas as NDJSON.
5. The client renders OpenUI Lang through `@openuidev/react-lang` using the local component library.

## Notes

- The API route requires the Node.js runtime because it reads the generated OpenUI prompt bundle from disk.
- Interrupted streaming widgets are restored as errors on the next page load so they can be retried.
- Canvas widget state is stored under `new-dashboard.canvas.widgets.v1` in browser `localStorage`.
