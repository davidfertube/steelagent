"""
Tests for the FastAPI server endpoints.
Tests run in demo mode (no API keys) which uses canned responses.
"""
import pytest
from httpx import AsyncClient, ASGITransport

# Import server directly - it will be in demo mode since we don't set API keys
from server import app


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test the /health endpoint returns OK status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert data["mode"] == "demo"


@pytest.mark.asyncio
async def test_chat_endpoint_success():
    """Test the /api/chat endpoint with successful response (demo mode)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/chat",
            json={"query": "What is the yield strength of A106 Grade B?"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "sources" in data
        # Demo mode returns canned responses about ASTM A106
        assert "A106" in data["response"] or "yield" in data["response"].lower()


@pytest.mark.asyncio
async def test_chat_endpoint_nace_query():
    """Test the /api/chat endpoint with NACE query (demo mode)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/chat",
            json={"query": "Does 4140 steel meet NACE MR0175 requirements?"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "sources" in data
        # Demo mode should return NACE-related response
        assert "NACE" in data["response"] or "MR0175" in data["response"]


@pytest.mark.asyncio
async def test_chat_endpoint_empty_query():
    """Test the /api/chat endpoint with empty query."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/chat",
            json={"query": ""}
        )

        # Should still return 200 with default response
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "sources" in data


@pytest.mark.asyncio
async def test_chat_endpoint_invalid_json():
    """Test the /api/chat endpoint with invalid JSON."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/chat",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )

        assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_cors_headers():
    """Test that CORS headers are properly set."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.options(
            "/api/chat",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
            }
        )

        # CORS preflight should succeed
        assert response.status_code == 200
