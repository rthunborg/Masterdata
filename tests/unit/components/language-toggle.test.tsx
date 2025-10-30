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

  it('renders both flag buttons simultaneously', () => {
    render(<LanguageToggle />);
    
    // Should have exactly 2 buttons (Swedish and English)
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    
    // Check for both flag emojis
    const swedishButton = screen.getByLabelText('Byt till svenska');
    const englishButton = screen.getByLabelText('Switch to English');
    expect(swedishButton).toBeInTheDocument();
    expect(englishButton).toBeInTheDocument();
  });

  it('highlights active language (English)', () => {
    mockUseLocale.mockReturnValue('en');
    
    render(<LanguageToggle />);
    
    const englishButton = screen.getByLabelText('Switch to English');
    const swedishButton = screen.getByLabelText('Byt till svenska');
    
    // English button should be highlighted (default variant) and disabled
    expect(englishButton).toBeDisabled();
    expect(englishButton).toHaveAttribute('aria-pressed', 'true');
    
    // Swedish button should be clickable (ghost variant) and enabled
    expect(swedishButton).not.toBeDisabled();
    expect(swedishButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('highlights active language (Swedish)', () => {
    mockUseLocale.mockReturnValue('sv');
    
    render(<LanguageToggle />);
    
    const swedishButton = screen.getByLabelText('Byt till svenska');
    const englishButton = screen.getByLabelText('Switch to English');
    
    // Swedish button should be highlighted and disabled
    expect(swedishButton).toBeDisabled();
    expect(swedishButton).toHaveAttribute('aria-pressed', 'true');
    
    // English button should be clickable and enabled
    expect(englishButton).not.toBeDisabled();
    expect(englishButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to Swedish when Swedish button clicked', () => {
    mockUseLocale.mockReturnValue('en');
    mockUsePathname.mockReturnValue('/en/dashboard');
    
    render(<LanguageToggle />);
    
    const swedishButton = screen.getByLabelText('Byt till svenska');
    fireEvent.click(swedishButton);
    
    // Should call router.replace with Swedish locale
    expect(mockReplace).toHaveBeenCalledWith('/en/dashboard', { locale: 'sv' });
  });

  it('switches to English when English button clicked', () => {
    mockUseLocale.mockReturnValue('sv');
    mockUsePathname.mockReturnValue('/sv/dashboard');
    
    render(<LanguageToggle />);
    
    const englishButton = screen.getByLabelText('Switch to English');
    fireEvent.click(englishButton);
    
    // Should call router.replace with English locale
    expect(mockReplace).toHaveBeenCalledWith('/sv/dashboard', { locale: 'en' });
  });

  it('does not switch when active button is clicked', () => {
    mockUseLocale.mockReturnValue('en');
    
    render(<LanguageToggle />);
    
    const englishButton = screen.getByLabelText('Switch to English');
    fireEvent.click(englishButton);
    
    // Should not call router.replace when clicking active button (disabled)
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('displays text labels on desktop screens', () => {
    render(<LanguageToggle />);
    
    // Look for the text labels with hidden/sm:inline classes
    const svLabel = screen.getByText('SV');
    const enLabel = screen.getByText('EN');
    
    expect(svLabel).toHaveClass('hidden', 'sm:inline');
    expect(enLabel).toHaveClass('hidden', 'sm:inline');
  });

  it('has accessible role group for language selection', () => {
    render(<LanguageToggle />);
    
    const group = screen.getByRole('group', { name: 'Language selection' });
    expect(group).toBeInTheDocument();
  });

  it('has correct ARIA labels for both buttons', () => {
    render(<LanguageToggle />);
    
    const swedishButton = screen.getByLabelText('Byt till svenska');
    const englishButton = screen.getByLabelText('Switch to English');
    
    expect(swedishButton).toHaveAttribute('aria-label', 'Byt till svenska');
    expect(englishButton).toHaveAttribute('aria-label', 'Switch to English');
  });
});
