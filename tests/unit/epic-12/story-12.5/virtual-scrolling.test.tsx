/**
 * Unit Tests: Virtual Scrolling
 * Story 12.5: Mobile Performance Optimizations - AC2
 * 
 * Tests that virtual scrolling is correctly implemented for large lists.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { EmployeeCardList } from '@/components/dashboard/employee-card-list';
import type { Employee } from '@/lib/types/employee';

// Helper function to generate test employees
function generateEmployees(count: number): Employee[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `emp-${i + 1}`,
    first_name: `Employee${i + 1}`,
    surname: 'Test',
    ssn: `19900101${String(i).padStart(4, '0')}`,
    email: `employee${i + 1}@example.com`,
    mobile: `+4670123456${String(i).padStart(2, '0')}`,
    rank: i % 2 === 0 ? 'SEV' : 'CHEF',
    gender: i % 2 === 0 ? 'Man' : 'Woman',
    town_district: 'Göteborg',
    hire_date: '2025-01-01',
    stena_date: null,
    omc_date: i < 20 ? '2025-03-08' : null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    one: null,
    one_marked_at: null,
    talmundo: null,
    isps: null,
    photo: null,
    origo: null,
    loneiva: null,
    mail_lon: null,
    bankuppgifter: null,
    li: null,
    passport: null,
    kvitto_c17_18: null,
    c17: null,
    crewing_done: null,
    comments: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

// Mock @tanstack/react-virtual
const mockUseVirtualizerCalls: Array<{
  count: number;
  enabled: boolean;
  overscan?: number;
  estimateSize?: () => number;
  measureElement?: (element: HTMLElement | null) => number;
}> = [];
const mockUseVirtualizerResults: Array<{ getVirtualItems: () => Array<{ key: string; index: number; start: number; size: number }>; getTotalSize: () => number }> = [];

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
}));

vi.mock('@tanstack/react-virtual', () => ({

  useVirtualizer: (config: {
    count: number;
    enabled: boolean;
    overscan?: number;
    estimateSize?: () => number;
    measureElement?: (element: HTMLElement | null) => number;
  }) => {
    // Track the call
    mockUseVirtualizerCalls.push(config);
    
    if (!config.enabled) {
      const result = {
        getVirtualItems: () => [],
        getTotalSize: () => 0,
      };
      mockUseVirtualizerResults.push(result);
      return result;
    }
    
    // Mock virtual items for testing
    const items = Array.from({ length: Math.min(config.count, 10) }, (_, i) => ({
      key: `virtual-${i}`,
      index: i,
      start: i * 200,
      size: 200,
    }));

    const result = {
      getVirtualItems: () => items,
      getTotalSize: () => config.count * 200,
    };
    mockUseVirtualizerResults.push(result);
    return result;
  },
}));

describe('Virtual Scrolling (Story 12.5)', () => {
  const mockEmployees = generateEmployees(150); // >100 items to trigger virtual scrolling

  const defaultProps = {
    employees: mockEmployees,
    isLoading: false,
    isHRAdmin: true,
    searchValue: '',
    onSearchChange: vi.fn(),
    columnConfigs: [],
  };

  beforeEach(() => {
    // Clear mock call tracking
    mockUseVirtualizerCalls.length = 0;
    mockUseVirtualizerResults.length = 0;
  });

  it('should enable virtual scrolling for lists with >100 items', () => {
    render(<EmployeeCardList {...defaultProps} />);

    // Verify useVirtualizer was called with enabled: true
    expect(mockUseVirtualizerCalls.length).toBeGreaterThan(0);
    
    const lastCall = mockUseVirtualizerCalls[mockUseVirtualizerCalls.length - 1];
    expect(lastCall.enabled).toBe(true);
    expect(lastCall.count).toBe(150);
  });

  it('should disable virtual scrolling for lists with <=100 items', () => {
    const smallList = generateEmployees(50); // <100 items
    
    render(
      <EmployeeCardList
        {...defaultProps}
        employees={smallList}
      />
    );

    expect(mockUseVirtualizerCalls.length).toBeGreaterThan(0);
    const lastCall = mockUseVirtualizerCalls[mockUseVirtualizerCalls.length - 1];
    // Virtual scrolling should be disabled for small lists
    expect(lastCall.enabled).toBe(false);
  });

  it('should render only visible items when virtual scrolling is enabled', () => {
    render(<EmployeeCardList {...defaultProps} />);

    expect(mockUseVirtualizerCalls.length).toBeGreaterThan(0);
    
    // Virtual scrolling should limit rendered items
    const virtualizer = mockUseVirtualizerResults[mockUseVirtualizerResults.length - 1];
    expect(virtualizer).toBeDefined();
    if (virtualizer) {
      const virtualItems = virtualizer.getVirtualItems();
      // Should only render a subset of items (viewport + overscan)
      expect(virtualItems.length).toBeLessThan(mockEmployees.length);
    }
  });

  it('should use correct overscan value for smooth scrolling', () => {
    render(<EmployeeCardList {...defaultProps} />);

    expect(mockUseVirtualizerCalls.length).toBeGreaterThan(0);
    
    const lastCall = mockUseVirtualizerCalls[mockUseVirtualizerCalls.length - 1];
    // Overscan should be set (typically 5 for smooth scrolling)
    expect(lastCall.overscan).toBe(5);
  });

  it('should estimate and measure card size correctly', () => {
    render(<EmployeeCardList {...defaultProps} />);

    expect(mockUseVirtualizerCalls.length).toBeGreaterThan(0);
    
    const lastCall = mockUseVirtualizerCalls[mockUseVirtualizerCalls.length - 1];
    expect(lastCall.estimateSize?.()).toBe(360);

    const measuredElement = {
      getBoundingClientRect: () => ({ height: 280 }),
    } as HTMLElement;
    expect(lastCall.measureElement?.(measuredElement)).toBe(280);
    expect(lastCall.measureElement?.(null)).toBe(360);
  });
});

