# AI News Project

FastAPI backend and React/Vite frontend for generating AI summaries of news and
recent YouTube videos.

## Repository Layout

```text
backend/          FastAPI backend, Python package, and pytest suite
frontend/         React/Vite dashboard for YouTube summary results
docker-compose.yml Local Postgres service for backend development
```

The backend exposes the existing news routes plus `GET /youtube-summary`. The
frontend starts on the YouTube summary dashboard and calls that endpoint through
Vite's local proxy.

## Quality Commands

From the repo root:

```bash
make help
make check
make format
make test
make build
```

`make check` runs backend Ruff linting, Ruff format checks, pytest, frontend
ESLint, Prettier checks, Vitest, and the Vite production build. `make format`
applies Ruff, ESLint, and Prettier fixes.

## Backend

Start Postgres:

```bash
docker compose up -d
```

Create `backend/.env` with local settings:

```env
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5434/newsdb
OPENAI_API_KEY=<your-valid-openai-api-key>
```

Run the API:

```bash
cd backend
uv sync
uv run uvicorn ai_news_project.main:app --reload --app-dir src
```

Open <http://127.0.0.1:8000/youtube-summary> for the default Science Channel
summary request. Optional query parameters:

```text
http://127.0.0.1:8000/youtube-summary?channel=sciencechannel&days=5
```

## Frontend

Install dependencies:

```bash
cd frontend
npm install
```

Run the backend on port 8000, then start Vite:

```bash
npm run dev
```

Open <http://127.0.0.1:5173>. Vite proxies `/youtube-summary` to the FastAPI
backend. The dashboard defaults to `sciencechannel` over the last 5 days and
also includes a FactTechz shortcut.

## API

- `GET /`
- `POST /load-news`
- `GET /articles`
- `GET /youtube-summary?channel=sciencechannel&days=5`
