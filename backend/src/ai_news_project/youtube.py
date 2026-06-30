import re
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse
from xml.etree import ElementTree

import requests
from youtube_transcript_api import YouTubeTranscriptApi

FACTTECHZ_CHANNEL_ID = "UCGdPm5Aq081vVD7ih9jZf6Q"
SCIENCE_CHANNEL_ID = "UCvJiYiBUbw4tmpRSZT2r1Hw"

CHANNEL_ALIASES = {
    "facttechz": FACTTECHZ_CHANNEL_ID,
    "sciencechannel": SCIENCE_CHANNEL_ID,
    "science channel": SCIENCE_CHANNEL_ID,
}
CHANNEL_ID_RE = re.compile(r"^UC[A-Za-z0-9_-]{10,}$")
YOUTUBE_FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
FEED_NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


class ChannelResolutionError(ValueError):
    pass


class YouTubeFeedError(RuntimeError):
    pass


class TranscriptUnavailableError(RuntimeError):
    pass


def resolve_channel_id(channel: str) -> str:
    channel = (channel or "").strip()

    if not channel:
        raise ChannelResolutionError("Channel is required")

    alias_match = CHANNEL_ALIASES.get(channel.lower())
    if alias_match:
        return alias_match

    if CHANNEL_ID_RE.match(channel):
        return channel

    parsed = urlparse(channel)
    if parsed.scheme and parsed.netloc:
        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) >= 2 and path_parts[0] == "channel":
            channel_id = path_parts[1]
            if CHANNEL_ID_RE.match(channel_id):
                return channel_id

    raise ChannelResolutionError(
        "Unsupported channel. Use sciencechannel, FactTechz, a YouTube channel ID, "
        "or a /channel/<id> URL."
    )


def _parse_published_at(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def _entry_link(entry: ElementTree.Element, video_id: str) -> str:
    link = entry.find("atom:link[@rel='alternate']", FEED_NAMESPACES)
    if link is None:
        link = entry.find("atom:link", FEED_NAMESPACES)

    if link is not None and link.attrib.get("href"):
        return link.attrib["href"]

    return f"https://www.youtube.com/watch?v={video_id}"


def parse_feed_videos(feed_xml: str, published_after: datetime) -> list[dict[str, str]]:
    try:
        root = ElementTree.fromstring(feed_xml)
    except ElementTree.ParseError as exc:
        raise YouTubeFeedError("Could not parse YouTube feed") from exc

    videos = []

    for entry in root.findall("atom:entry", FEED_NAMESPACES):
        published_text = entry.findtext("atom:published", default="", namespaces=FEED_NAMESPACES)
        if not published_text:
            continue

        try:
            published_at = _parse_published_at(published_text)
        except ValueError:
            continue

        if published_at < published_after:
            continue

        video_id = entry.findtext("yt:videoId", default="", namespaces=FEED_NAMESPACES)
        title = entry.findtext("atom:title", default="", namespaces=FEED_NAMESPACES)
        if not video_id or not title:
            continue

        description = entry.findtext(
            "media:group/media:description",
            default="",
            namespaces=FEED_NAMESPACES,
        )

        videos.append(
            (
                published_at,
                {
                    "title": title.strip(),
                    "video_id": video_id.strip(),
                    "url": _entry_link(entry, video_id.strip()),
                    "published_at": published_at.isoformat(),
                    "description": description.strip(),
                },
            )
        )

    return [video for _, video in sorted(videos, key=lambda item: item[0], reverse=True)]


def get_recent_videos(
    channel_name: str = "sciencechannel",
    days: int = 5,
    now: datetime | None = None,
) -> list[dict[str, str]]:
    if days < 1 or days > 30:
        raise ValueError("days must be between 1 and 30")

    current_time = now or datetime.now(UTC)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=UTC)

    published_after = current_time.astimezone(UTC) - timedelta(days=days)
    channel_id = resolve_channel_id(channel_name)
    feed_url = YOUTUBE_FEED_URL.format(channel_id=channel_id)

    try:
        response = requests.get(feed_url, timeout=15)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise YouTubeFeedError("Could not fetch YouTube feed") from exc

    return parse_feed_videos(response.text, published_after)


def _snippet_text(snippet) -> str:
    if isinstance(snippet, dict):
        return snippet.get("text", "")

    return getattr(snippet, "text", "")


def get_video_transcript(video_id: str) -> str:
    try:
        fetched_transcript = YouTubeTranscriptApi().fetch(
            video_id,
            languages=("hi", "en"),
        )
        transcript = " ".join(
            text
            for text in (_snippet_text(snippet).strip() for snippet in fetched_transcript)
            if text
        )
    except Exception as exc:
        raise TranscriptUnavailableError("Transcript not available for this video.") from exc

    if not transcript:
        raise TranscriptUnavailableError("Transcript not available for this video.")

    return transcript
