## Run locally

Start Postgres:

```bash
docker compose up -d
```

Set environment variables in `.env`:

```text
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5434/newsdb
OPENAI_API_KEY=<your-valid-openai-api-key>
```

Start the FastAPI app:

```bash
uv run uvicorn main:app --reload
```

Open the Science Channel YouTube summary endpoint:

```text
http://127.0.0.1:8000/youtube-summary
```

Optional query parameters:

```text
http://127.0.0.1:8000/youtube-summary?channel=sciencechannel&days=5
```
