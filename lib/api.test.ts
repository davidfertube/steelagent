import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryKnowledgeBase, checkHealth, getHealthStatus, ApiRequestError } from './api';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('queryKnowledgeBase', () => {
    it('should send query and return response on success', async () => {
      const mockResponse = { response: 'Test response about steel specifications' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await queryKnowledgeBase('What is A106 Grade B?');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'What is A106 Grade B?' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fall back to demo mode on server error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ detail: 'Server error occurred' }),
      });

      // Demo fallback returns a response instead of throwing
      const result = await queryKnowledgeBase('yield strength');
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('sources');
      expect(result.response).toContain('ASTM A106');
    });

    it('should fall back to demo mode on 404 error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      // Demo fallback returns a response instead of throwing
      const result = await queryKnowledgeBase('nace compliance');
      expect(result).toHaveProperty('response');
      expect(result.response).toContain('NACE');
    });

    it('should fall back to demo mode on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Demo fallback returns a response instead of throwing
      const result = await queryKnowledgeBase('compare materials');
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('sources');
    });
  });

  describe('checkHealth', () => {
    it('should return true when server is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await checkHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return false when server is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await checkHealth();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkHealth();

      expect(result).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status on success', async () => {
      const mockStatus = { status: 'ok' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      const result = await getHealthStatus();

      expect(result).toEqual(mockStatus);
    });

    it('should return null on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await getHealthStatus();

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getHealthStatus();

      expect(result).toBeNull();
    });
  });
});
