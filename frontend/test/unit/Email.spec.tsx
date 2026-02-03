import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailForm } from '../../src/components/Email';
import { vi } from 'vitest';

describe('EmailForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with input and button', () => {
    render(<EmailForm onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('your@email.com');
    const button = screen.getByRole('button', { name: /continue/i });

    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it('calls onSubmit with email when form is submitted with valid email', async () => {
    const user = userEvent.setup();
    render(<EmailForm onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('your@email.com');
    const button = screen.getByRole('button', { name: /continue/i });

    await user.type(input, 'test@example.com');
    await user.click(button);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<EmailForm onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText('your@email.com');
    const button = screen.getByRole('button', { name: /continue/i });

    await user.type(input, 'invalid-email');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when submitted with empty email', async () => {
    const user = userEvent.setup();
    render(<EmailForm onSubmit={mockOnSubmit} />);

    const button = screen.getByRole('button', { name: /continue/i });
    await user.click(button);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('renders with correct container styling', () => {
    const { container } = render(<EmailForm onSubmit={mockOnSubmit} />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveStyle({
      maxWidth: '400px',
      margin: '100px auto',
      padding: '24px',
    });
  });
});
