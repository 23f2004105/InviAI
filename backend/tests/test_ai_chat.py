"""
AI chat: earlier turns must reach the model, otherwise the advisor keeps
re-asking for budget / period / risk on every message (the "stuck in a loop" bug).
"""

import pytest

from app.routers import ai_chat
from tests.conftest import register


class FakeModel:
    def __init__(self):
        self.prompts = []

    def generate_content(self, prompt):
        self.prompts.append(prompt)

        class R:
            text = "ok"

        return R()


@pytest.fixture()
def fake_model(monkeypatch):
    model = FakeModel()
    monkeypatch.setattr(ai_chat, "get_gemini_model", lambda: model)
    return model


def test_chat_sends_conversation_history_to_model(client, fake_model):
    h = register(client)
    history = [
        {"role": "assistant", "content": "What's your budget and investment period?"},
        {"role": "user", "content": "Rs 50000 for 5 years"},
        {"role": "assistant", "content": "What is your risk tolerance?"},
    ]
    r = client.post("/api/ai/chat", json={"message": "moderate", "history": history}, headers=h)
    assert r.status_code == 200, r.text
    prompt = fake_model.prompts[-1]
    assert "Rs 50000 for 5 years" in prompt
    assert "What is your risk tolerance?" in prompt
    assert prompt.rstrip().endswith("Assistant:")
    assert prompt.index("Rs 50000 for 5 years") < prompt.index("User: moderate")


def test_chat_without_history_still_works(client, fake_model):
    h = register(client)
    r = client.post("/api/ai/chat", json={"message": "hi"}, headers=h)
    assert r.status_code == 200
    assert r.json()["response"] == "ok"


def test_chat_history_is_capped(client, fake_model):
    h = register(client)
    history = [{"role": "user", "content": f"msg-{i}"} for i in range(50)]
    client.post("/api/ai/chat", json={"message": "x", "history": history}, headers=h)
    prompt = fake_model.prompts[-1]
    assert "msg-49" in prompt
    assert "msg-0\n" not in prompt


def test_slow_gemini_falls_back_instead_of_hanging(client, monkeypatch):
    import time

    class SlowModel:
        def generate_content(self, prompt):
            time.sleep(2)

    monkeypatch.setattr(ai_chat, "get_gemini_model", lambda: SlowModel())
    monkeypatch.setattr(ai_chat, "GEMINI_TIMEOUT_SECONDS", 0.2)
    h = register(client)
    # (Wall time isn't asserted: TestClient waits for the abandoned worker thread on loop shutdown;
    # a long-running uvicorn loop does not.)
    r = client.post("/api/ai/chat", json={"message": "low risk please"}, headers=h)
    assert r.status_code == 200
    assert "conservative" in r.json()["response"]


def test_offline_advisor_reads_risk_from_history(client, monkeypatch):
    def boom():
        raise RuntimeError("no gemini")

    monkeypatch.setattr(ai_chat, "get_gemini_model", boom)
    h = register(client)
    history = [{"role": "user", "content": "I want something safe, low risk"}]
    r = client.post("/api/ai/chat", json={"message": "what should I buy?", "history": history}, headers=h)
    assert r.status_code == 200
    assert "conservative" in r.json()["response"]
