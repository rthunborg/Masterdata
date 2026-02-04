import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import LoginForm from '@/app/(auth)/login/login-form';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth store
const mockLogin = vi.fn();
vi.mock('@/lib/store/auth-store', () => ({
  useAuthStore: () => ({
    login: mockLogin,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('LoginForm', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements', () => {
    renderWithQueryClient(<LoginForm />);
    
    expect(screen.getByRole('heading', { name: 'Logga in' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-post')).toBeInTheDocument();
    expect(screen.getByLabelText('Lösenord')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logga in/i })).toBeInTheDocument();
  });

  it('shows validation errors for invalid email', async () => {
    renderWithQueryClient(<LoginForm />);
    
    const emailInput = screen.getByLabelText('E-post');
    const passwordInput = screen.getByLabelText('Lösenord');
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword123' } });
    
    const form = emailInput.closest('form')!;
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows validation errors for short password', async () => {
    renderWithQueryClient(<LoginForm />);
    
    const emailInput = screen.getByLabelText('E-post');
    const passwordInput = screen.getByLabelText('Lösenord');
    const submitButton = screen.getByRole('button', { name: /Logga in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('calls login and redirects on successful form submission', async () => {
    mockLogin.mockResolvedValue(undefined);
    
    renderWithQueryClient(<LoginForm />);
    
    const emailInput = screen.getByLabelText('E-post');
    const passwordInput = screen.getByLabelText('Lösenord');
    const submitButton = screen.getByRole('button', { name: /Logga in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'validpassword123');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error message on failed login', async () => {
    const { toast } = await import('sonner');
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValue(new Error(errorMessage));
    
    renderWithQueryClient(<LoginForm />);
    
    const emailInput = screen.getByLabelText('E-post');
    const passwordInput = screen.getByLabelText('Lösenord');
    const submitButton = screen.getByRole('button', { name: /Logga in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

