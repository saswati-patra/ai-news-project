# AI News Project Frontend

React/Vite frontend for the AI News Project YouTube summary dashboard.

The app fetches `GET /youtube-summary` results from the backend and displays
summary cards, metrics, source shortcuts, validation, retry, refresh, loading,
error, and empty states.

## Structure

```text
src/
  main.tsx                       React entrypoint
  styles.css                     Tailwind v4 theme tokens and global styles
  lib/youtube-summary-api.ts     Typed backend API client
  pages/summaries-page.tsx       Dashboard page and controls
  components/                    Summary cards, metrics, and UI primitives
  test/setup.ts                  Vitest/JSDOM test setup
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the backend on port 8000, then run Vite:

```bash
npm run dev
```

Open <http://127.0.0.1:5173>. Vite binds to `127.0.0.1` and proxies
`/youtube-summary` to <http://127.0.0.1:8000>.

The dashboard defaults to the Science Channel over the last 5 days:

```text
/youtube-summary?channel=sciencechannel&days=5
```

## Quality Checks

From the repo root:

```bash
make frontend-check
make frontend-format
```

From this directory:

```bash
npm run lint
npm run format:check
npm test
npm run build
```

`npm run build` runs TypeScript checks for the app and Vite config before
creating the production build.
