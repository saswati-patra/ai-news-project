from fastapi import FastAPI, HTTPException, Query

from ai_news_project.ai import (
    OpenAIConfigError,
    OpenAIQuotaError,
    OpenAISummaryError,
    summarize_text,
    summarize_youtube_video,
)
from ai_news_project.database import Base, SessionLocal, engine
from ai_news_project.models import Article
from ai_news_project.news import sample_articles
from ai_news_project.youtube import (
    ChannelResolutionError,
    TranscriptUnavailableError,
    YouTubeFeedError,
    get_recent_videos,
    get_video_transcript,
)

app = FastAPI()

Base.metadata.create_all(bind=engine)


@app.get("/")
def home():
    return {"message": "AI News Project is running"}


@app.post("/load-news")
def load_news():
    db = SessionLocal()

    for item in sample_articles:
        summary = summarize_text(item["content"])

        article = Article(
            title=item["title"],
            url=item["url"],
            content=item["content"],
            summary=summary,
        )

        db.add(article)

    db.commit()
    db.close()

    return {"message": "News loaded and summarized"}


@app.get("/articles")
def get_articles():
    db = SessionLocal()
    articles = db.query(Article).all()
    db.close()

    return articles


@app.get("/youtube-summary")
def youtube_summary(
    channel: str = Query(default="sciencechannel"),
    days: int = Query(default=5, ge=1, le=30),
):
    try:
        videos = get_recent_videos(channel, days=days)
    except ChannelResolutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except YouTubeFeedError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    results = []

    for video in videos:
        transcript_available = True
        summary_source = "transcript"

        try:
            summary_content = get_video_transcript(video["video_id"])
        except TranscriptUnavailableError:
            transcript_available = False
            summary_source = "title_description"
            summary_content = video.get("description") or video["title"]

        try:
            summary = summarize_youtube_video(
                video["title"],
                summary_content,
                summary_source,
            )
        except (OpenAIConfigError, OpenAISummaryError) as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except OpenAIQuotaError as exc:
            raise HTTPException(status_code=429, detail=str(exc)) from exc

        results.append(
            {
                "title": video["title"],
                "video_id": video["video_id"],
                "url": video["url"],
                "published_at": video["published_at"],
                "summary": summary,
                "summary_source": summary_source,
                "transcript_available": transcript_available,
            }
        )

    return results
