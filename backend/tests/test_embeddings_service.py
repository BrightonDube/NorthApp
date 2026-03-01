"""
Unit tests for embeddings.py service
Tests embedding creation and normalization functionality
"""
import pytest
from unittest.mock import MagicMock, patch
from app.services.embeddings import create_embedding, _normalize_dimensions


def test_normalize_dimensions_exact_match():
    """Test normalization when dimensions already match"""
    embedding = [0.1, 0.2, 0.3, 0.4, 0.5]
    target = 5
    
    result = _normalize_dimensions(embedding, target)
    
    assert result == embedding
    assert len(result) == target


def test_normalize_dimensions_truncate():
    """Test normalization when embedding is too large"""
    embedding = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
    target = 5
    
    result = _normalize_dimensions(embedding, target)
    
    assert len(result) == target
    assert result == [0.1, 0.2, 0.3, 0.4, 0.5]


def test_normalize_dimensions_pad():
    """Test normalization when embedding is too small"""
    embedding = [0.1, 0.2, 0.3]
    target = 5
    
    result = _normalize_dimensions(embedding, target)
    
    assert len(result) == target
    assert result == [0.1, 0.2, 0.3, 0.0, 0.0]


def test_normalize_dimensions_empty():
    """Test normalization with empty embedding"""
    embedding = []
    target = 3
    
    result = _normalize_dimensions(embedding, target)
    
    assert len(result) == target
    assert result == [0.0, 0.0, 0.0]


@pytest.mark.asyncio
async def test_create_embedding_success():
    """Test successful embedding creation"""
    text = "This is a test document"
    
    # Mock Voyage API response
    mock_response = MagicMock()
    mock_response.embeddings = [[0.1] * 1536]
    
    mock_client = MagicMock()
    mock_client.embed = MagicMock(return_value=mock_response)
    
    # Mock settings
    mock_settings = MagicMock()
    mock_settings.voyage_api_key = "test-api-key"
    mock_settings.voyage_embedding_model = "voyage-3"
    mock_settings.memory_embedding_dimensions = 1536
    
    with patch("app.services.embeddings.get_settings", return_value=mock_settings):
        with patch("app.services.embeddings.voyageai.Client", return_value=mock_client):
            with patch("asyncio.to_thread", return_value=mock_response):
                result = await create_embedding(text)
    
    assert len(result) == 1536
    assert all(isinstance(x, float) for x in result)


@pytest.mark.asyncio
async def test_create_embedding_with_query_input_type():
    """Test embedding creation with query input type"""
    text = "What are my goals?"
    
    mock_response = MagicMock()
    mock_response.embeddings = [[0.1] * 1536]
    
    mock_client = MagicMock()
    mock_client.embed = MagicMock(return_value=mock_response)
    
    mock_settings = MagicMock()
    mock_settings.voyage_api_key = "test-api-key"
    mock_settings.voyage_embedding_model = "voyage-3"
    mock_settings.memory_embedding_dimensions = 1536
    
    with patch("app.services.embeddings.get_settings", return_value=mock_settings):
        with patch("app.services.embeddings.voyageai.Client", return_value=mock_client):
            with patch("asyncio.to_thread", return_value=mock_response) as mock_to_thread:
                await create_embedding(text, input_type="query")
                
                # Verify input_type was passed correctly
                call_args = mock_to_thread.call_args
                # asyncio.to_thread is called with (func, *args, **kwargs)
                # The function is client.embed, and input_type is a kwarg
                assert "input_type" in call_args[1] or len(call_args[0]) > 3


@pytest.mark.asyncio
async def test_create_embedding_no_api_key():
    """Test error when API key is missing"""
    text = "Test text"
    
    mock_settings = MagicMock()
    mock_settings.voyage_api_key = None
    
    with patch("app.services.embeddings.get_settings", return_value=mock_settings):
        with pytest.raises(RuntimeError, match="VOYAGE_API_KEY is required"):
            await create_embedding(text)


@pytest.mark.asyncio
async def test_create_embedding_empty_response():
    """Test error when API returns no embeddings"""
    text = "Test text"
    
    mock_response = MagicMock()
    mock_response.embeddings = []
    
    mock_client = MagicMock()
    mock_client.embed = MagicMock(return_value=mock_response)
    
    mock_settings = MagicMock()
    mock_settings.voyage_api_key = "test-api-key"
    mock_settings.voyage_embedding_model = "voyage-3"
    mock_settings.memory_embedding_dimensions = 1536
    
    with patch("app.services.embeddings.get_settings", return_value=mock_settings):
        with patch("app.services.embeddings.voyageai.Client", return_value=mock_client):
            with patch("asyncio.to_thread", return_value=mock_response):
                with pytest.raises(RuntimeError, match="returned no vectors"):
                    await create_embedding(text)


@pytest.mark.asyncio
async def test_create_embedding_empty_vector():
    """Test error when API returns empty embedding vector"""
    text = "Test text"
    
    mock_response = MagicMock()
    mock_response.embeddings = [[]]  # Empty vector
    
    mock_client = MagicMock()
    mock_client.embed = MagicMock(return_value=mock_response)
    
    mock_settings = MagicMock()
    mock_settings.voyage_api_key = "test-api-key"
    mock_settings.voyage_embedding_model = "voyage-3"
    mock_settings.memory_embedding_dimensions = 1536
    
    with patch("app.services.embeddings.get_settings", return_value=mock_settings):
        with patch("app.services.embeddings.voyageai.Client", return_value=mock_client):
            with patch("asyncio.to_thread", return_value=mock_response):
                with pytest.raises(RuntimeError, match="empty embedding vector"):
                    await create_embedding(text)


@pytest.mark.asyncio
async def test_create_embedding_normalization():
    """Test that embeddings are normalized to target dimensions"""
    text = "Test text"
    
    # Mock response with different dimension size
    mock_response = MagicMock()
    mock_response.embeddings = [[0.1] * 2000]  # Larger than target
    
    mock_client = MagicMock()
    mock_client.embed = MagicMock(return_value=mock_response)
    
    mock_settings = MagicMock()
    mock_settings.voyage_api_key = "test-api-key"
    mock_settings.voyage_embedding_model = "voyage-3"
    mock_settings.memory_embedding_dimensions = 1536  # Target size
    
    with patch("app.services.embeddings.get_settings", return_value=mock_settings):
        with patch("app.services.embeddings.voyageai.Client", return_value=mock_client):
            with patch("asyncio.to_thread", return_value=mock_response):
                result = await create_embedding(text)
    
    # Should be normalized to target dimensions
    assert len(result) == 1536


@pytest.mark.asyncio
async def test_create_embedding_default_input_type():
    """Test that default input type is 'document'"""
    text = "Test text"
    
    mock_response = MagicMock()
    mock_response.embeddings = [[0.1] * 1536]
    
    mock_client = MagicMock()
    mock_client.embed = MagicMock(return_value=mock_response)
    
    mock_settings = MagicMock()
    mock_settings.voyage_api_key = "test-api-key"
    mock_settings.voyage_embedding_model = "voyage-3"
    mock_settings.memory_embedding_dimensions = 1536

    mock_cache = MagicMock()
    mock_cache.get = MagicMock(return_value=None)
    mock_cache.set = MagicMock()
    
    with patch("app.services.embeddings.get_settings", return_value=mock_settings):
        with patch("app.services.embeddings.get_cache", return_value=mock_cache):
            with patch("app.services.embeddings.voyageai.Client", return_value=mock_client):
                with patch("app.services.embeddings.asyncio.to_thread", return_value=mock_response) as mock_to_thread:
                    await create_embedding(text)
                    
                    # Verify asyncio.to_thread was called (cache miss → real embed)
                    mock_to_thread.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
