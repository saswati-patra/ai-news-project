import os

from dotenv import load_dotenv
from openai import AuthenticationError, OpenAI, OpenAIError, RateLimitError

load_dotenv()


class OpenAIConfigError(RuntimeError):
    pass


class OpenAISummaryError(RuntimeError):
    pass


class OpenAIQuotaError(RuntimeError):
    pass


def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise OpenAIConfigError("OPENAI_API_KEY is required")

    return OpenAI(api_key=api_key)


def _create_summary(messages: list[dict[str, str]]) -> str:
    try:
        response = _get_client().chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
        )
    except OpenAIConfigError:
        raise
    except AuthenticationError as exc:
        raise OpenAIConfigError("OPENAI_API_KEY is invalid") from exc
    except RateLimitError as exc:
        error_code = None
        if isinstance(exc.body, dict):
            error = exc.body.get("error", exc.body)
            if isinstance(error, dict):
                error_code = error.get("code")

        if error_code == "insufficient_quota":
            raise OpenAIQuotaError(
                "OpenAI quota exceeded. Add API credits or raise your billing limit."
            ) from exc

        raise OpenAISummaryError("OpenAI rate limit reached") from exc
    except OpenAIError as exc:
        raise OpenAISummaryError("OpenAI summary request failed") from exc

    return response.choices[0].message.content


def summarize_text(text):
    return _create_summary(
        [
            {"role": "system", "content": "Summarize news articles in simple words."},
            {"role": "user", "content": text},
        ]
    )


def summarize_youtube_video(title, content, summary_source="transcript"):
    if summary_source == "title_description":
        source_note = (
            "The transcript is unavailable. Summarize only from the title and feed "
            "description, and mention that the summary is based on limited metadata."
        )
    else:
        source_note = "Summarize the transcript."

    return _create_summary(
        [
            {
                "role": "system",
                "content": (
                    "Summarize YouTube videos in simple beginner-friendly English. "
                    "Keep the summary concise and factual."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Video title: {title}\n"
                    f"Source: {summary_source}\n"
                    f"Instruction: {source_note}\n\n"
                    f"Content:\n{content}"
                ),
            },
        ]
    )
