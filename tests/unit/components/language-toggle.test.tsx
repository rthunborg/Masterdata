import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageToggle } from '@/components/layout/language-toggle';

// Mock next-intl hooks
const mockUseLocale = vi.fn(() => 'en');
const mockReplace = vi.fn();
const mockUsePathname = vi.fn(() => '/en/dashboard');

vi.mock('next-intl', () => ({
  useLocale: () => mockUseLocale(),
}));

vi.mock('@/lib/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => mockUsePathname(),
}));

describe('LanguageToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the current locale flag (English)', () => {
    mockUseLocale.mockReturnValue('en');
    
    render(<LanguageToggle />);
    
    // Check for English flag emoji (appears twice: desktop and mobile)
    const flags = screen.getAllByText(/🇬🇧/);
    expect(flags.length).toBeGreaterThan(0);
  });

  it('renders the current locale flag (Swedish)', () => {
    mockUseLocale.mockReturnValue('sv');
    
    render(<LanguageToggle />);
    
    // Check for Swedish flag emoji (appears twice: desktop and mobile)
    const flags = screen.getAllByText(/🇸🇪/);
    expect(flags.length).toBeGreaterThan(0);
  });

  it('displays full locale text on desktop (English)', () => {
    mockUseLocale.mockReturnValue('en');
    
    render(<LanguageToggle />);
    
    // The component should show "🇬🇧 EN" on desktop
    const desktopText = screen.getByText(/🇬🇧 EN/);
    expect(desktopText).toBeInTheDocument();
    expect(desktopText).toHaveClass('hidden', 'sm:inline');
  });

  it('displays full locale text on desktop (Swedish)', () => {
    mockUseLocale.mockReturnValue('sv');
    
    render(<LanguageToggle />);
    
    // The component should show "🇸🇪 SV" on desktop
    const desktopText = screen.getByText(/🇸🇪 SV/);
    expect(desktopText).toBeInTheDocument();
    expect(desktopText).toHaveClass('hidden', 'sm:inline');
  });

  it('switches locale when clicked (English to Swedish)', () => {
    mockUseLocale.mockReturnValue('en');
    mockUsePathname.mockReturnValue('/en/dashboard');
    
    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should call router.replace with Swedish locale
    expect(mockReplace).toHaveBeenCalledWith('/en/dashboard', { locale: 'sv' });
  });

  it('switches locale when clicked (Swedish to English)', () => {
    mockUseLocale.mockReturnValue('sv');
    mockUsePathname.mockReturnValue('/sv/dashboard');
    
    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Should call router.replace with English locale
    expect(mockReplace).toHaveBeenCalledWith('/sv/dashboard', { locale: 'en' });
  });

  it('has accessible ARIA label for English', () => {
    mockUseLocale.mockReturnValue('en');
    
    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to Swedish');
  });

  it('has accessible ARIA label for Swedish', () => {
    mockUseLocale.mockReturnValue('sv');
    
    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to English');
  });

  it('renders as a button', () => {
    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });

  it('includes Globe icon', () => {
    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    // lucide-react Globe icon should be present
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
