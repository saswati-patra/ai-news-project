import httpx
import pytest
from openai import AuthenticationError, RateLimitError

from ai_news_project import ai


def test_summarize_youtube_video_reports_invalid_openai_key(monkeypatch):
    class FakeCompletions:
        def create(self, model, messages):
            request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
            response = httpx.Response(401, request=request)
            raise AuthenticationError(
                "Incorrect API key",
                response=response,
                body={"error": {"code": "invalid_api_key"}},
            )

    class FakeChat:
        completions = FakeCompletions()

    class FakeClient:
        chat = FakeChat()

    monkeypatch.setattr(ai, "_get_client", lambda: FakeClient())

    with pytest.raises(ai.OpenAIConfigError, match="OPENAI_API_KEY is invalid"):
        ai.summarize_youtube_video("Title", "Transcript", "transcript")


def test_summarize_youtube_video_reports_insufficient_quota(monkeypatch):
    class FakeCompletions:
        def create(self, model, messages):
            request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
            response = httpx.Response(429, request=request)
            raise RateLimitError(
                "Insufficient quota",
                response=response,
                body={"error": {"code": "insufficient_quota"}},
            )

    class FakeChat:
        completions = FakeCompletions()

    class FakeClient:
        chat = FakeChat()

    monkeypatch.setattr(ai, "_get_client", lambda: FakeClient())

    with pytest.raises(ai.OpenAIQuotaError, match="OpenAI quota exceeded"):
        ai.summarize_youtube_video("Title", "Transcript", "transcript")
