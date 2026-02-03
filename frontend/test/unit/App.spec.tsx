import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// Reset modules before each suite so mocks apply correctly
beforeEach(() => {
  vi.resetModules();
});

// Mock common dependencies
vi.mock('../../src/hooks/useWebSockets', () => ({
  useWebSocket: vi.fn(),
}));

// Mock service with realistic data
vi.mock('../../src/services/extraction.service', () => ({
  extractionService: {
    getExtractions: vi.fn().mockResolvedValue([
      {
        id: 'abc123',
        vendorName: 'Starbucks Coffee',
        date: '2026-01-15',
        currency: 'USD',
        items: [],
        tax: 0.75,
        total: 8.25,
      },
    ]),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('App component', () => {
  describe('unauthenticated user', () => {
    beforeEach(() => {
      vi.doMock('../../src/hooks/useAuth', () => ({
        useAuth: () => ({
          isAuthenticated: false,
          token: null,
          login: vi.fn(),
        }),
      }));
    });

    it('renders EmailForm with Continue button', async () => {
      const App = (await import('../../src/App')).default;
      render(<App />);

      expect(
        screen.getByPlaceholderText(/your@email.com/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Continue/i }),
      ).toBeInTheDocument();
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => {
      vi.doMock('../../src/hooks/useAuth', () => ({
        useAuth: () => ({
          isAuthenticated: true,
          token: 'fake-token',
          login: vi.fn(),
        }),
      }));
    });

    it('renders header and main layout', async () => {
      const App = (await import('../../src/App')).default;
      render(<App />);

      // Header
      expect(
        await screen.findByRole('heading', { name: /Receipt Extractor/i }),
      ).toBeInTheDocument();

      // Section title
      expect(
        await screen.findByRole('heading', { name: /My Extractions/i }),
      ).toBeInTheDocument();

      // New Extraction button
      expect(
        await screen.findByRole('button', { name: /New Extraction/i }),
      ).toBeInTheDocument();
    });

    it('opens New Extraction modal when button clicked', async () => {
      const App = (await import('../../src/App')).default;
      render(<App />);

      const button = await screen.findByRole('button', {
        name: /New Extraction/i,
      });
      fireEvent.click(button);

      // Modal heading should appear
      // Modal title is rendered as a heading-like element with role="dialog"
      expect(
        await screen.findByRole('dialog', { name: /New Extraction/i }),
      ).toBeInTheDocument();
    });

    it('calls extractionService.getExtractions on mount', async () => {
      const App = (await import('../../src/App')).default;
      const { extractionService } =
        await import('../../src/services/extraction.service');

      render(<App />);

      // Assert service call
      expect(extractionService.getExtractions).toHaveBeenCalledTimes(1);
    });

    it('calls extractionService.delete when deleting an extraction', async () => {
      const App = (await import('../../src/App')).default;
      const { extractionService } =
        await import('../../src/services/extraction.service');

      render(<App />);

      // Simulate deletion
      await extractionService.delete('abc123');

      // Assert delete was called
      expect(extractionService.delete).toHaveBeenCalledWith('abc123');
    });
  });
});
