import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtractionList } from '../../src/components/ExtractionList';
import { Extraction, ExtractionStatus } from '../../src/types';
import { vi } from 'vitest';
describe('ExtractionList', () => {
  const mockExtractions: Extraction[] = [
    {
      id: '1',
      filename: 'receipt1.jpg',
      imageUrl: 'http://example.com/1.jpg',
      status: ExtractionStatus.EXTRACTED,
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      filename: 'receipt2.jpg',
      imageUrl: 'http://example.com/2.jpg',
      status: ExtractionStatus.EXTRACTING,
      createdAt: '2024-01-02T15:30:00Z',
    },
  ];

  const mockOnSelect = vi.fn();
  const mockOnDelete = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when loading is true', () => {
    render(
      <ExtractionList
        extractions={[]}
        loading={true}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders empty state when no extractions', () => {
    render(
      <ExtractionList
        extractions={[]}
        loading={false}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('No extractions found')).toBeInTheDocument();
    expect(screen.getByText(/Click/i)).toBeInTheDocument();
    expect(screen.getByText(/"New Extraction"/i)).toBeInTheDocument();
  });

  it('renders list of extractions', () => {
    render(
      <ExtractionList
        extractions={mockExtractions}
        loading={false}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('receipt1.jpg')).toBeInTheDocument();
    expect(screen.getByText('receipt2.jpg')).toBeInTheDocument();
  });

  it('displays status tags for each extraction', () => {
    render(
      <ExtractionList
        extractions={mockExtractions}
        loading={false}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Extracting')).toBeInTheDocument();
  });

  it('calls onSelect when extraction row is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExtractionList
        extractions={mockExtractions}
        loading={false}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    const row = screen.getByText('receipt1.jpg').closest('.extraction-row');
    await user.click(row!);

    expect(mockOnSelect).toHaveBeenCalledWith(mockExtractions[0]);
  });

  it('opens dropdown menu when action button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExtractionList
        extractions={mockExtractions}
        loading={false}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    const actionButtons = screen.getAllByRole('button');
    const firstActionButton = actionButtons.find((btn) =>
      btn.querySelector('.anticon-ellipsis'),
    );

    await user.click(firstActionButton!);

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('shows delete confirmation modal when delete is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExtractionList
        extractions={mockExtractions}
        loading={false}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    const actionButtons = screen.getAllByRole('button');
    const firstActionButton = actionButtons.find((btn) =>
      btn.querySelector('.anticon-ellipsis'),
    );

    await user.click(firstActionButton!);

    const deleteMenuItem = await screen.findByText('Delete');
    await user.click(deleteMenuItem);

    await waitFor(() => {
      expect(
        screen.getByText(/Are you sure you want to delete this extraction/i),
      ).toBeInTheDocument();
    });
  });

  it('calls onDelete when deletion is confirmed', async () => {
    const user = userEvent.setup();
    render(
      <ExtractionList
        extractions={mockExtractions}
        loading={false}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    const actionButtons = screen.getAllByRole('button');
    const firstActionButton = actionButtons.find((btn) =>
      btn.querySelector('.anticon-ellipsis'),
    );

    await user.click(firstActionButton!);

    const deleteMenuItem = await screen.findByText('Delete');
    await user.click(deleteMenuItem);

    const confirmButton = await screen.findByRole('button', {
      name: /delete/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });
  });

  it('does not call onSelect when action button area is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExtractionList
        extractions={mockExtractions}
        loading={false}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />,
    );

    const actionButtons = screen.getAllByRole('button');
    const firstActionButton = actionButtons.find((btn) =>
      btn.querySelector('.anticon-ellipsis'),
    );

    await user.click(firstActionButton!);

    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
