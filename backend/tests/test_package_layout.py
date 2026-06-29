import importlib
import sys


def test_backend_is_importable_as_a_package(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    for module_name in list(sys.modules):
        if module_name == "ai_news_project" or module_name.startswith("ai_news_project."):
            sys.modules.pop(module_name)

    main = importlib.import_module("ai_news_project.main")

    assert main.app.routes
