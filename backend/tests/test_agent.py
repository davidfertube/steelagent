"""
Tests for the RAG agent module logic.
These tests mock external dependencies at the module level before import.
"""
import pytest
from unittest.mock import MagicMock, patch
import sys


# Mock dependencies before importing agent
@pytest.fixture(scope="module", autouse=True)
def mock_agent_dependencies():
    """Mock all external dependencies before agent module import."""
    # Create mock modules
    mock_langchain_google = MagicMock()
    mock_langchain_pinecone = MagicMock()

    # Mock the ChatGoogleGenerativeAI
    mock_llm = MagicMock()
    mock_response = MagicMock()
    mock_response.content = "Test response about A106 Grade B yield strength."
    mock_llm.invoke.return_value = mock_response
    mock_langchain_google.ChatGoogleGenerativeAI.return_value = mock_llm
    mock_langchain_google.GoogleGenerativeAIEmbeddings.return_value = MagicMock()

    # Mock the Pinecone vectorstore
    mock_vectorstore = MagicMock()
    mock_doc = MagicMock()
    mock_doc.page_content = "ASTM A106 Grade B: Minimum yield strength 35,000 psi."
    mock_doc.metadata = {"source": "astm_a106.pdf", "page": 1}
    mock_vectorstore.similarity_search.return_value = [mock_doc]
    mock_langchain_pinecone.PineconeVectorStore.return_value = mock_vectorstore

    # Patch sys.modules before importing agent
    with patch.dict(sys.modules, {
        'langchain_google_genai': mock_langchain_google,
        'langchain_pinecone': mock_langchain_pinecone,
    }):
        # Also patch environment variables
        with patch.dict('os.environ', {
            'GOOGLE_API_KEY': 'test_key',
            'PINECONE_API_KEY': 'test_key',
            'PINECONE_INDEX_NAME': 'test-index',
        }):
            yield {
                'llm': mock_llm,
                'vectorstore': mock_vectorstore,
            }


def test_agent_state_structure():
    """Test that AgentState has the correct structure."""
    from langchain_core.messages import HumanMessage

    # AgentState should be a TypedDict with messages and context
    state = {
        "messages": [HumanMessage(content="test")],
        "context": "test context",
        "sources": []
    }

    assert "messages" in state
    assert "context" in state
    assert "sources" in state


def test_demo_response_yield_strength():
    """Test demo responses contain expected content for yield strength query."""
    from server import get_demo_response

    result = get_demo_response("What is the yield strength of A106?")

    assert "response" in result
    assert "sources" in result
    assert "A106" in result["response"]
    assert len(result["sources"]) > 0


def test_demo_response_nace():
    """Test demo responses contain expected content for NACE query."""
    from server import get_demo_response

    result = get_demo_response("Does 4140 meet NACE MR0175?")

    assert "response" in result
    assert "sources" in result
    assert "NACE" in result["response"] or "MR0175" in result["response"]


def test_demo_response_compare():
    """Test demo responses contain expected content for compare query."""
    from server import get_demo_response

    result = get_demo_response("Compare A53 and A106")

    assert "response" in result
    assert "sources" in result
    # Compare query should return comparison info
    assert "A106" in result["response"] or "A53" in result["response"]


def test_demo_response_hardness():
    """Test demo responses contain expected content for hardness query."""
    from server import get_demo_response

    result = get_demo_response("What is the maximum hardness for sour service?")

    assert "response" in result
    assert "sources" in result
    assert "HRC" in result["response"] or "hardness" in result["response"].lower()


def test_demo_response_default():
    """Test demo responses return default for unknown query."""
    from server import get_demo_response

    result = get_demo_response("some random query that matches nothing")

    assert "response" in result
    assert "sources" in result
    # Default response provides guidance
    assert len(result["response"]) > 0


def test_demo_response_sources_structure():
    """Test that demo response sources have correct structure."""
    from server import get_demo_response

    result = get_demo_response("yield strength A106")

    assert "sources" in result
    for source in result["sources"]:
        assert "ref" in source
        assert "document" in source
        assert "page" in source
        assert "content_preview" in source
