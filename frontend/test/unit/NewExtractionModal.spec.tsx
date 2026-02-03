import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewExtractionModal } from '../../src/components/NewExtractionModal';
import { extractionService } from '../../src/services/extraction.service';

vi.mock('../../src/services/extraction.service', () => ({
  extractionService: {
    createExtraction: vi.fn(),
  },
}));

// jest.mock('../hooks/useAuth', () => ({
//   useAuth: () => ({ token: btoa('test@example.com') }),
// }));

describe('NewExtractionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open is true', () => {
    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText('New Extraction')).toBeInTheDocument();
  });

  it('does not render modal when open is false', () => {
    render(
      <NewExtractionModal
        open={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.queryByText('New Extraction')).not.toBeInTheDocument();
  });

  it('renders file upload area initially', () => {
    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText('Choose file to upload')).toBeInTheDocument();
    expect(
      screen.getByText(/Support for JPG, JPEG, PNG files/i),
    ).toBeInTheDocument();
  });

  it('submit button is disabled when no file is selected', () => {
    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    const submitButton = screen.getByRole('button', { name: /extract/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('accepts valid image file and displays file card', async () => {
    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

    const uploadArea = screen
      .getByText('Choose file to upload')
      .closest('.ant-upload-wrapper');
    const input = uploadArea?.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/test.jpg/i)).toBeInTheDocument();
    });
  });

  it('enables submit button when file is selected', async () => {
    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    const uploadArea = screen
      .getByText('Choose file to upload')
      .closest('.ant-upload-wrapper');
    const input = uploadArea?.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /extract/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('calls createExtraction service when submit is clicked', async () => {
    const user = userEvent.setup();
    const mockExtraction = {
      id: '1',
      filename: 'test.jpg',
      status: 'extracted',
    };
    (extractionService.createExtraction as jest.Mock).mockResolvedValue(
      mockExtraction,
    );

    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    const uploadArea = screen
      .getByText('Choose file to upload')
      .closest('.ant-upload-wrapper');
    const input = uploadArea?.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /extract/i }),
      ).not.toBeDisabled();
    });

    const submitButton = screen.getByRole('button', { name: /extract/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(extractionService.createExtraction).toHaveBeenCalledWith(file);
      expect(mockOnSuccess).toHaveBeenCalledWith(mockExtraction);
    });
  });

  it('rejects files larger than 10MB', async () => {
    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    const file = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB

    const uploadArea = screen
      .getByText('Choose file to upload')
      .closest('.ant-upload-wrapper');
    const input = uploadArea?.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    // File should not be added
    await waitFor(() => {
      expect(screen.queryByText(/large.jpg/i)).not.toBeInTheDocument();
    });
  });

  it('rejects non-image files', async () => {
    render(
      <NewExtractionModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    const file = new File(['test'], 'document.pdf', {
      type: 'application/pdf',
    });

    const uploadArea = screen
      .getByText('Choose file to upload')
      .closest('.ant-upload-wrapper');
    const input = uploadArea?.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    // File should not be added
    await waitFor(() => {
      expect(screen.queryByText(/document.pdf/i)).not.toBeInTheDocument();
    });
  });
});
