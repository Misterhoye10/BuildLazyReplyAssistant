import pytest
from unittest.mock import patch
from backend.app import create_app
from backend.config import Config
from backend.services.ai_service import AIServiceError

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    """Test health endpoint returns 200 with service info."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "LazyReply API"
    assert "provider" in data
    assert "model" in data

def test_missing_message(client):
    """Test rejection when message is empty."""
    response = client.post("/api/process", json={"message": "", "tone": "friendly"})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

def test_whitespace_message(client):
    """Test rejection when message contains only whitespace."""
    response = client.post("/api/process", json={"message": "   \n\t  ", "tone": "friendly"})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data

def test_message_too_long(client):
    """Test rejection when message exceeds 4,000 characters."""
    long_msg = "A" * 4001
    response = client.post("/api/process", json={"message": long_msg, "tone": "professional"})
    assert response.status_code == 400
    data = response.get_json()
    assert "limit" in data["error"]

def test_invalid_tone(client):
    """Test rejection when tone is not one of friendly, professional, brief."""
    response = client.post("/api/process", json={"message": "Hello world", "tone": "aggressive"})
    assert response.status_code == 400
    data = response.get_json()
    assert "Invalid tone" in data["error"]

def test_non_json_request(client):
    """Test rejection when request is not JSON."""
    response = client.post("/api/process", data="not json", content_type="text/plain")
    assert response.status_code == 400
    data = response.get_json()
    assert "JSON" in data["error"]

@patch("backend.app.process_message")
def test_successful_processing_contract(mock_process, client):
    """Test successful response matches the expected PRD contract."""
    mock_process.return_value = {
        "summary": "Team meeting at 10 AM.",
        "key_points": ["Meeting time: 10 AM", "Agenda: Q3 review"],
        "questions": ["Can you attend?"],
        "action_items": [{"task": "Confirm attendance", "deadline": "Friday"}],
        "suggested_reply": "Yes, I will attend.",
        "importantPoints": ["Meeting time: 10 AM", "Agenda: Q3 review"],
        "actionItems": ["Confirm attendance (Deadline: Friday)"],
        "suggestedReply": "Yes, I will attend.",
    }

    response = client.post(
        "/api/process",
        json={"message": "Can you attend our Q3 review meeting at 10 AM? Confirm by Friday.", "tone": "brief"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["summary"] == "Team meeting at 10 AM."
    assert len(data["key_points"]) == 2
    assert len(data["questions"]) == 1
    assert data["action_items"][0]["deadline"] == "Friday"
    assert data["suggested_reply"] == "Yes, I will attend."

@patch("backend.app.process_message")
def test_ai_provider_error_handling(mock_process, client):
    """Test error response when AI provider fails."""
    mock_process.side_effect = AIServiceError("AI provider error: Rate limit reached", status_code=429)

    response = client.post(
        "/api/process",
        json={"message": "Can we meet tomorrow?", "tone": "friendly"}
    )
    assert response.status_code == 429
    data = response.get_json()
    assert "Rate limit" in data["error"]

def test_analyze_alias_endpoint(client):
    """Test /analyze alias works identically to /api/process."""
    response = client.post("/analyze", json={"message": "", "tone": "friendly"})
    assert response.status_code == 400

def test_refine_reply_validation(client):
    """Test /api/refine-reply rejects invalid action."""
    response = client.post("/api/refine-reply", json={"current_reply": "Hi", "action": "invalid"})
    assert response.status_code == 400
    assert "Invalid action" in response.get_json()["error"]

@patch("backend.app.refine_reply")
def test_refine_reply_success(mock_refine, client):
    """Test /api/refine-reply returns refined text."""
    mock_refine.return_value = "Got it. See you Friday."
    response = client.post(
        "/api/refine-reply",
        json={"original_message": "Can you make it Friday?", "current_reply": "I can make it.", "action": "shorter"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["suggested_reply"] == "Got it. See you Friday."

@pytest.mark.skipif(not Config.GROQ_API_KEY, reason="GROQ_API_KEY not configured")
def test_live_groq_integration(client):
    """Live end-to-end integration test with Groq API."""
    test_msg = "Hey Alex, can we reschedule our 2 PM check-in to Thursday morning? Let me know if that works for you."
    response = client.post("/api/process", json={"message": test_msg, "tone": "friendly"})
    assert response.status_code == 200
    data = response.get_json()
    assert "summary" in data and len(data["summary"]) > 0
    assert "key_points" in data and isinstance(data["key_points"], list)
    assert "questions" in data and isinstance(data["questions"], list)
    assert "action_items" in data and isinstance(data["action_items"], list)
    assert "suggested_reply" in data and len(data["suggested_reply"]) > 0
