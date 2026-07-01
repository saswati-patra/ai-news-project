# AI News Project Backend

FastAPI backend for AI-generated news and YouTube video summaries.

## Run Locally

Start Postgres:

```bash
cd ..
docker compose up -d
```

Set environment variables in `.env`:

```env
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5434/newsdb
OPENAI_API_KEY=<your-valid-openai-api-key>
```

Start the FastAPI app:

```bash
uv sync
uv run uvicorn ai_news_project.main:app --reload --app-dir src
```

Open the Science Channel YouTube summary endpoint:

```text
http://127.0.0.1:8000/youtube-summary
```

Optional query parameters:

```text
http://127.0.0.1:8000/youtube-summary?channel=sciencechannel&days=5
```

## Quality Checks

From the repo root:

```bash
make backend-check
make backend-format
```

Or from this directory:

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest
```
