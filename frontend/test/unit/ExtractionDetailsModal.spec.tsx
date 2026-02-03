import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtractionDetailsModal } from '../../src/components/ExtractionDetailsModal';
import { Extraction, ExtractionStatus } from '../../src/types/';
import { vi } from 'vitest';
describe('ExtractionDetailsModal', () => {
  const mockExtraction: Extraction = {
    id: '1',
    filename: 'receipt.jpg',
    imageUrl: 'http://example.com/image.jpg',
    status: ExtractionStatus.EXTRACTED,
    createdAt: '2024-01-01',
    vendorName: 'Test Store',
    date: '2024-01-01',
    currency: 'USD',
    items: [
      { name: 'Item 1', qty: 2, cost: 10 },
      { name: 'Item 2', qty: 1, cost: 20 },
    ],
    tax: 3,
    total: 43,
  };

  const mockOnClose = vi.fn();
  const mockOnDelete = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open is true', () => {
    render(
      <ExtractionDetailsModal
        extraction={mockExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('receipt.jpg')).toBeInTheDocument();
    expect(screen.getByTestId('modal-header-tag')).toHaveTextContent('Done');
  });

  it('does not render modal when open is false', () => {
    render(
      <ExtractionDetailsModal
        extraction={mockExtraction}
        open={false}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.queryByText('receipt.jpg')).not.toBeInTheDocument();
  });

  it('displays extraction details for extracted status', () => {
    render(
      <ExtractionDetailsModal
        extraction={mockExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('Test Store')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('displays extracting alert for EXTRACTING status', () => {
    const extractingExtraction = {
      ...mockExtraction,
      status: ExtractionStatus.EXTRACTING,
    };

    render(
      <ExtractionDetailsModal
        extraction={extractingExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('Extraction in Progress')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Please wait while we extract data from your receipt...',
      ),
    ).toBeInTheDocument();
  });

  it('displays invalid alert for INVALID status', () => {
    const invalidExtraction = {
      ...mockExtraction,
      status: ExtractionStatus.INVALID,
      failureReason: 'Invalid format',
    };

    render(
      <ExtractionDetailsModal
        extraction={invalidExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('Invalid Receipt')).toBeInTheDocument();
    expect(screen.getByText('Invalid format')).toBeInTheDocument();
  });

  it('displays failed alert for FAILED status', () => {
    const failedExtraction = {
      ...mockExtraction,
      status: ExtractionStatus.FAILED,
      failureReason: 'Server error',
    };

    render(
      <ExtractionDetailsModal
        extraction={failedExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('Extraction Failed')).toBeInTheDocument();
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('calls onClose when Done button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExtractionDetailsModal
        extraction={mockExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    const doneButton = screen.getByRole('button', { name: /done/i });
    await user.click(doneButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows delete confirmation modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExtractionDetailsModal
        extraction={mockExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Are you sure you want to permanently delete this record?',
        ),
      ).toBeInTheDocument();
    });
  });

  it('calls onDelete and onClose when delete is confirmed', async () => {
    const user = userEvent.setup();
    render(
      <ExtractionDetailsModal
        extraction={mockExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /yes/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays receipt image with correct src', () => {
    render(
      <ExtractionDetailsModal
        extraction={mockExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    const image = screen.getByRole('img', { name: /receipt.jpg/i });
    expect(image).toHaveAttribute('src', 'http://example.com/image.jpg');
  });

  it('formats currency correctly in table', () => {
    render(
      <ExtractionDetailsModal
        extraction={mockExtraction}
        open={true}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
    expect(screen.getByText('$3.00')).toBeInTheDocument();
    expect(screen.getByText('$43.00')).toBeInTheDocument();
  });
});
