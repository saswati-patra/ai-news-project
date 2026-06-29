from datetime import datetime, timezone

import pytest

from ai_news_project import youtube


FEED_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/"
      xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <yt:videoId>recentshort1</yt:videoId>
    <title>Recent Short</title>
    <link rel="alternate" href="https://www.youtube.com/shorts/recentshort1"/>
    <published>2026-06-07T00:30:27+00:00</published>
    <media:group>
      <media:description>Short description</media:description>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>recentvideo2</yt:videoId>
    <title>Recent Long Video</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=recentvideo2"/>
    <published>2026-06-05T00:30:12+00:00</published>
    <media:group>
      <media:description>Long video description</media:description>
    </media:group>
  </entry>
  <entry>
    <yt:videoId>oldvideo333</yt:videoId>
    <title>Old Video</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=oldvideo333"/>
    <published>2026-06-01T00:30:12+00:00</published>
    <media:group>
      <media:description>Old description</media:description>
    </media:group>
  </entry>
</feed>
"""


class FakeResponse:
    status_code = 200
    text = FEED_XML

    def raise_for_status(self):
        return None


def test_resolve_channel_id_accepts_supported_facttechz_inputs():
    expected = "UCGdPm5Aq081vVD7ih9jZf6Q"

    assert youtube.resolve_channel_id("FactTechz") == expected
    assert youtube.resolve_channel_id(expected) == expected
    assert (
        youtube.resolve_channel_id(f"https://www.youtube.com/channel/{expected}")
        == expected
    )


def test_resolve_channel_id_accepts_supported_science_channel_inputs():
    expected = "UCvJiYiBUbw4tmpRSZT2r1Hw"

    assert youtube.resolve_channel_id("sciencechannel") == expected
    assert youtube.resolve_channel_id("Science Channel") == expected
    assert youtube.resolve_channel_id(expected) == expected


def test_resolve_channel_id_rejects_arbitrary_channel_names():
    with pytest.raises(youtube.ChannelResolutionError):
        youtube.resolve_channel_id("Some Other Channel")


def test_get_recent_videos_uses_feed_filters_by_days_and_keeps_shorts(monkeypatch):
    captured = {}

    def fake_get(url, timeout):
        captured["url"] = url
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(youtube.requests, "get", fake_get)

    videos = youtube.get_recent_videos(
        "FactTechz",
        days=5,
        now=datetime(2026, 6, 8, 12, 0, tzinfo=timezone.utc),
    )

    assert "channel_id=UCGdPm5Aq081vVD7ih9jZf6Q" in captured["url"]
    assert captured["timeout"] == 15
    assert [video["title"] for video in videos] == [
        "Recent Short",
        "Recent Long Video",
    ]
    assert videos[0] == {
        "title": "Recent Short",
        "video_id": "recentshort1",
        "url": "https://www.youtube.com/shorts/recentshort1",
        "published_at": "2026-06-07T00:30:27+00:00",
        "description": "Short description",
    }


def test_get_recent_videos_defaults_to_science_channel(monkeypatch):
    captured = {}

    def fake_get(url, timeout):
        captured["url"] = url
        return FakeResponse()

    monkeypatch.setattr(youtube.requests, "get", fake_get)

    youtube.get_recent_videos(
        days=5,
        now=datetime(2026, 6, 8, 12, 0, tzinfo=timezone.utc),
    )

    assert "channel_id=UCvJiYiBUbw4tmpRSZT2r1Hw" in captured["url"]


def test_get_recent_videos_raises_feed_error_for_bad_xml(monkeypatch):
    class BadXmlResponse:
        status_code = 200
        text = "<feed>"

        def raise_for_status(self):
            return None

    monkeypatch.setattr(youtube.requests, "get", lambda url, timeout: BadXmlResponse())

    with pytest.raises(youtube.YouTubeFeedError):
        youtube.get_recent_videos(
            "FactTechz",
            days=5,
            now=datetime(2026, 6, 8, 12, 0, tzinfo=timezone.utc),
        )


def test_get_video_transcript_uses_current_transcript_api(monkeypatch):
    class Snippet:
        def __init__(self, text):
            self.text = text

    class FakeTranscriptApi:
        def fetch(self, video_id, languages):
            assert video_id == "video123"
            assert languages == ("hi", "en")
            return [Snippet("hello"), Snippet("world")]

    monkeypatch.setattr(youtube, "YouTubeTranscriptApi", lambda: FakeTranscriptApi())

    assert youtube.get_video_transcript("video123") == "hello world"
