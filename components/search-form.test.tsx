import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchForm } from './search-form';

// Mock the API module
vi.mock('@/lib/api', () => ({
  queryKnowledgeBase: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import { queryKnowledgeBase, ApiRequestError, Source } from '@/lib/api';

describe('SearchForm', () => {
  const mockOnResult = vi.fn();
  const mockOnError = vi.fn();
  const mockOnLoadingChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input and button', () => {
    render(
      <SearchForm
        onResult={mockOnResult}
        onError={mockOnError}
        onLoadingChange={mockOnLoadingChange}
      />
    );

    expect(screen.getByPlaceholderText(/ask about steel specs/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run comparison/i })).toBeInTheDocument();
  });

  it('should disable button when input is empty', () => {
    render(
      <SearchForm
        onResult={mockOnResult}
        onError={mockOnError}
        onLoadingChange={mockOnLoadingChange}
      />
    );

    const button = screen.getByRole('button', { name: /run comparison/i });
    expect(button).toBeDisabled();
  });

  it('should enable button when input has text', async () => {
    render(
      <SearchForm
        onResult={mockOnResult}
        onError={mockOnError}
        onLoadingChange={mockOnLoadingChange}
      />
    );

    const input = screen.getByPlaceholderText(/ask about steel specs/i);
    await userEvent.type(input, 'What is A106 Grade B?');

    const button = screen.getByRole('button', { name: /run comparison/i });
    expect(button).not.toBeDisabled();
  });

  it('should call API and onResult on successful submission', async () => {
    const mockSources: Source[] = [
      { ref: '[1]', document: 'astm_a106.pdf', page: '5', content_preview: 'A106 Grade B specifications...' }
    ];
    const mockResponse = { response: 'A106 Grade B is a seamless carbon steel pipe.', sources: mockSources };
    vi.mocked(queryKnowledgeBase).mockResolvedValueOnce(mockResponse);

    render(
      <SearchForm
        onResult={mockOnResult}
        onError={mockOnError}
        onLoadingChange={mockOnLoadingChange}
      />
    );

    const input = screen.getByPlaceholderText(/ask about steel specs/i);
    await userEvent.type(input, 'What is A106 Grade B?');

    const button = screen.getByRole('button', { name: /run comparison/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(queryKnowledgeBase).toHaveBeenCalledWith('What is A106 Grade B?', undefined);
      expect(mockOnResult).toHaveBeenCalledWith('A106 Grade B is a seamless carbon steel pipe.', mockSources);
    });
  });

  it('should call onError on API failure', async () => {
    const mockError = new (ApiRequestError as typeof Error)('Server error', 500);
    vi.mocked(queryKnowledgeBase).mockRejectedValueOnce(mockError);

    render(
      <SearchForm
        onResult={mockOnResult}
        onError={mockOnError}
        onLoadingChange={mockOnLoadingChange}
      />
    );

    const input = screen.getByPlaceholderText(/ask about steel specs/i);
    await userEvent.type(input, 'test query');

    const button = screen.getByRole('button', { name: /run comparison/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Server error');
    });
  });

  it('should show loading state during submission', async () => {
    vi.mocked(queryKnowledgeBase).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ response: 'test', sources: [] }), 100))
    );

    render(
      <SearchForm
        onResult={mockOnResult}
        onError={mockOnError}
        onLoadingChange={mockOnLoadingChange}
      />
    );

    const input = screen.getByPlaceholderText(/ask about steel specs/i);
    await userEvent.type(input, 'test query');

    const button = screen.getByRole('button', { name: /run comparison/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnLoadingChange).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockOnLoadingChange).toHaveBeenCalledWith(false);
    });
  });
});
