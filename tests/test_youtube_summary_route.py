import importlib
import sys

from fastapi.testclient import TestClient


def load_test_main(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    for module_name in ["main", "app.database", "app.models", "app.ai"]:
        sys.modules.pop(module_name, None)

    return importlib.import_module("main")


def test_youtube_summary_defaults_to_sciencechannel_and_uses_transcript(monkeypatch):
    main = load_test_main(monkeypatch)
    calls = {}

    def fake_get_recent_videos(channel, days):
        calls["recent"] = (channel, days)
        return [
            {
                "title": "First video",
                "video_id": "video1",
                "url": "https://www.youtube.com/watch?v=video1",
                "published_at": "2026-06-07T00:30:27+00:00",
                "description": "First description",
            }
        ]

    def fake_summarize_youtube_video(title, content, summary_source):
        calls["summary"] = (title, content, summary_source)
        return "Transcript summary"

    monkeypatch.setattr(main, "get_recent_videos", fake_get_recent_videos)
    monkeypatch.setattr(main, "get_video_transcript", lambda video_id: "Full transcript")
    monkeypatch.setattr(main, "summarize_youtube_video", fake_summarize_youtube_video)

    response = TestClient(main.app).get("/youtube-summary")

    assert response.status_code == 200
    assert calls["recent"] == ("sciencechannel", 5)
    assert calls["summary"] == ("First video", "Full transcript", "transcript")
    assert response.json() == [
        {
            "title": "First video",
            "video_id": "video1",
            "url": "https://www.youtube.com/watch?v=video1",
            "published_at": "2026-06-07T00:30:27+00:00",
            "summary": "Transcript summary",
            "summary_source": "transcript",
            "transcript_available": True,
        }
    ]


def test_youtube_summary_falls_back_to_title_description(monkeypatch):
    main = load_test_main(monkeypatch)
    calls = {}

    monkeypatch.setattr(
        main,
        "get_recent_videos",
        lambda channel, days: [
            {
                "title": "First video",
                "video_id": "video1",
                "url": "https://www.youtube.com/watch?v=video1",
                "published_at": "2026-06-07T00:30:27+00:00",
                "description": "First description",
            }
        ],
    )
    monkeypatch.setattr(
        main,
        "get_video_transcript",
        lambda video_id: (_ for _ in ()).throw(main.TranscriptUnavailableError("off")),
    )

    def fake_summarize_youtube_video(title, content, summary_source):
        calls["summary"] = (title, content, summary_source)
        return "Fallback summary"

    monkeypatch.setattr(main, "summarize_youtube_video", fake_summarize_youtube_video)

    response = TestClient(main.app).get("/youtube-summary")

    assert response.status_code == 200
    assert calls["summary"] == ("First video", "First description", "title_description")
    assert response.json()[0]["summary"] == "Fallback summary"
    assert response.json()[0]["summary_source"] == "title_description"
    assert response.json()[0]["transcript_available"] is False


def test_youtube_summary_rejects_invalid_channel(monkeypatch):
    main = load_test_main(monkeypatch)

    def fake_get_recent_videos(channel, days):
        raise main.ChannelResolutionError("Unsupported channel")

    monkeypatch.setattr(main, "get_recent_videos", fake_get_recent_videos)

    response = TestClient(main.app).get("/youtube-summary?channel=@not-supported")

    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported channel"


def test_youtube_summary_maps_feed_errors_to_bad_gateway(monkeypatch):
    main = load_test_main(monkeypatch)

    def fake_get_recent_videos(channel, days):
        raise main.YouTubeFeedError("Could not fetch YouTube feed")

    monkeypatch.setattr(main, "get_recent_videos", fake_get_recent_videos)

    response = TestClient(main.app).get("/youtube-summary")

    assert response.status_code == 502
    assert response.json()["detail"] == "Could not fetch YouTube feed"


def test_youtube_summary_maps_openai_errors_to_server_error(monkeypatch):
    main = load_test_main(monkeypatch)

    monkeypatch.setattr(
        main,
        "get_recent_videos",
        lambda channel, days: [
            {
                "title": "First video",
                "video_id": "video1",
                "url": "https://www.youtube.com/watch?v=video1",
                "published_at": "2026-06-07T00:30:27+00:00",
                "description": "First description",
            }
        ],
    )
    monkeypatch.setattr(main, "get_video_transcript", lambda video_id: "Full transcript")
    monkeypatch.setattr(
        main,
        "summarize_youtube_video",
        lambda title, content, summary_source: (_ for _ in ()).throw(
            main.OpenAIConfigError("OPENAI_API_KEY is required")
        ),
    )

    response = TestClient(main.app).get("/youtube-summary")

    assert response.status_code == 500
    assert response.json()["detail"] == "OPENAI_API_KEY is required"


def test_youtube_summary_maps_openai_quota_errors_to_too_many_requests(monkeypatch):
    main = load_test_main(monkeypatch)

    monkeypatch.setattr(
        main,
        "get_recent_videos",
        lambda channel, days: [
            {
                "title": "First video",
                "video_id": "video1",
                "url": "https://www.youtube.com/watch?v=video1",
                "published_at": "2026-06-07T00:30:27+00:00",
                "description": "First description",
            }
        ],
    )
    monkeypatch.setattr(main, "get_video_transcript", lambda video_id: "Full transcript")
    monkeypatch.setattr(
        main,
        "summarize_youtube_video",
        lambda title, content, summary_source: (_ for _ in ()).throw(
            main.OpenAIQuotaError("OpenAI quota exceeded. Add API credits or raise your billing limit.")
        ),
    )

    response = TestClient(main.app).get("/youtube-summary")

    assert response.status_code == 429
    assert response.json()["detail"] == (
        "OpenAI quota exceeded. Add API credits or raise your billing limit."
    )


def test_youtube_summary_bounds_days_query(monkeypatch):
    main = load_test_main(monkeypatch)

    response = TestClient(main.app).get("/youtube-summary?days=31")

    assert response.status_code == 422
