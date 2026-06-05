# Dashboard Canvas

Prompt-driven dashboard prototyping built with Next.js, Groq, and OpenUI Lang.

The app gives you an infinite canvas where you can create generated dashboard widgets from short prompts. Each widget streams through two stages:

1. Generate realistic preview data for the requested dashboard concept.
2. Generate compact OpenUI Lang that renders the widget with the local component library.

Widgets can be dragged, resized, retried, deleted, zoomed, and are persisted in browser `localStorage`.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Groq SDK for generation
- OpenUI Lang for generated widget markup
- Recharts for generated chart components
- Zod for runtime schemas

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create `.env.local` with your Groq API key:

```bash
GROQ_API_KEY=your_groq_api_key
```

Optional model overrides:

```bash
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
- Enter a prompt such as `show burn rate by month` or `pipeline forecast by segment`.
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
src/app/api/generate-widget/route.ts   Groq-backed widget generation endpoint
src/lib/dashboard-schemas.ts           Zod schemas and shared widget data types
src/lib/widget-stream.ts               NDJSON stream event types
src/openui/dashboard-render-library.tsx Local OpenUI component library
src/openui/dashboard-prompt-library.ts  Prompt source for OpenUI generation
src/generated/openui-dashboard-prompt.txt Generated prompt bundle used by the API
```

## Generation Flow

1. The client posts `{ prompt }` to `/api/generate-widget`.
2. The API validates `GROQ_API_KEY`.
3. Groq generates structured preview data and the API validates it with Zod.
4. The API streams the preview data followed by OpenUI Lang deltas as NDJSON.
5. The client renders OpenUI Lang through `@openuidev/react-lang` using the local component library.

## Notes

- The API route requires the Node.js runtime because it reads the generated OpenUI prompt bundle from disk.
- Interrupted streaming widgets are restored as errors on the next page load so they can be retried.
- Canvas widget state is stored under `new-dashboard.canvas.widgets.v1` in browser `localStorage`.
