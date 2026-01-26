"""
Tests for the RAG agent module.
"""
import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import HumanMessage, AIMessage


@pytest.fixture
def mock_env():
    """Mock environment variables for testing."""
    with patch.dict('os.environ', {
        'GOOGLE_API_KEY': 'test_google_key',
        'PINECONE_API_KEY': 'test_pinecone_key',
        'PINECONE_INDEX_NAME': 'test-index',
    }):
        yield


@pytest.fixture
def mock_llm():
    """Mock the LLM to avoid API calls."""
    mock = MagicMock()
    mock_response = MagicMock()
    mock_response.content = "Based on the context, A106 Grade B has a yield strength of 35,000 psi."
    mock.invoke.return_value = mock_response
    return mock


@pytest.fixture
def mock_vectorstore():
    """Mock the vector store to avoid Pinecone calls."""
    mock = MagicMock()

    # Create mock documents
    mock_doc1 = MagicMock()
    mock_doc1.page_content = "ASTM A106 Grade B: Minimum yield strength 35,000 psi."
    mock_doc1.metadata = {"source": "astm_a106.pdf", "page": 1}

    mock_doc2 = MagicMock()
    mock_doc2.page_content = "Tensile strength requirements for Grade B: 60,000 psi minimum."
    mock_doc2.metadata = {"source": "astm_a106.pdf", "page": 2}

    mock.similarity_search.return_value = [mock_doc1, mock_doc2]
    return mock


def test_retrieve_node(mock_env, mock_vectorstore):
    """Test that the retrieve node correctly fetches documents."""
    with patch('agent.vectorstore', mock_vectorstore), \
         patch('agent.llm', MagicMock()):

        # Import after patching to avoid initialization errors
        from agent import retrieve

        state = {
            "messages": [HumanMessage(content="What is the yield strength of A106 Grade B?")],
            "context": ""
        }

        result = retrieve(state)

        # Should have called similarity_search
        mock_vectorstore.similarity_search.assert_called_once()

        # Should have context in result
        assert "context" in result
        assert "yield strength" in result["context"].lower() or "35,000" in result["context"]


def test_retrieve_node_extracts_query(mock_env, mock_vectorstore):
    """Test that retrieve node extracts the last message as query."""
    with patch('agent.vectorstore', mock_vectorstore), \
         patch('agent.llm', MagicMock()):

        from agent import retrieve

        state = {
            "messages": [
                HumanMessage(content="Hello"),
                HumanMessage(content="What is A106?"),
            ],
            "context": ""
        }

        retrieve(state)

        # Should search with the last message
        call_args = mock_vectorstore.similarity_search.call_args
        assert "A106" in call_args[0][0]


def test_generate_node(mock_env, mock_llm, mock_vectorstore):
    """Test that the generate node produces a response."""
    with patch('agent.vectorstore', mock_vectorstore), \
         patch('agent.llm', mock_llm):

        from agent import generate

        state = {
            "messages": [HumanMessage(content="What is A106 Grade B?")],
            "context": "ASTM A106 Grade B: Minimum yield strength 35,000 psi."
        }

        result = generate(state)

        # Should have called LLM
        mock_llm.invoke.assert_called_once()

        # Should have messages in result
        assert "messages" in result
        assert len(result["messages"]) == 1


def test_generate_node_includes_context(mock_env, mock_llm, mock_vectorstore):
    """Test that generate node includes context in the prompt."""
    with patch('agent.vectorstore', mock_vectorstore), \
         patch('agent.llm', mock_llm):

        from agent import generate

        context = "Important context about steel specifications."
        state = {
            "messages": [HumanMessage(content="Test question")],
            "context": context
        }

        generate(state)

        # Check that context was included in the prompt
        call_args = mock_llm.invoke.call_args[0][0]
        prompt_content = call_args[0].content
        assert context in prompt_content


def test_run_agent(mock_env, mock_llm, mock_vectorstore):
    """Test the full agent execution."""
    with patch('agent.vectorstore', mock_vectorstore), \
         patch('agent.llm', mock_llm):

        from agent import run_agent

        result = run_agent("What is the yield strength of A106 Grade B?")

        # Should return a string response
        assert isinstance(result, str)
        assert len(result) > 0


def test_agent_state_typing(mock_env):
    """Test that AgentState has correct typing."""
    with patch('agent.vectorstore', MagicMock()), \
         patch('agent.llm', MagicMock()):

        from agent import AgentState

        # AgentState should be a TypedDict with messages and context
        state: AgentState = {
            "messages": [HumanMessage(content="test")],
            "context": "test context"
        }

        assert "messages" in state
        assert "context" in state


def test_empty_context_handling(mock_env, mock_llm):
    """Test that agent handles empty context gracefully."""
    mock_vs = MagicMock()
    mock_vs.similarity_search.return_value = []  # No documents found

    with patch('agent.vectorstore', mock_vs), \
         patch('agent.llm', mock_llm):

        from agent import retrieve

        state = {
            "messages": [HumanMessage(content="Unknown query")],
            "context": ""
        }

        result = retrieve(state)

        # Should handle empty results
        assert "context" in result
        assert result["context"] == ""  # Empty string when no docs
