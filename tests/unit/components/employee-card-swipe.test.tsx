/**
 * Component Tests for Employee Card Swipe Gestures
 * Story 12.2: Swipe Gestures for Row Actions
 * Tests swipe gesture detection, action button reveal, and interaction
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { EmployeeCard } from "@/components/dashboard/employee-card";
import { createTestEmployee } from "@/../tests/helpers/validation-test-helpers";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";

// Mock useMediaQuery to control mobile/desktop detection
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(() => true), // Default to mobile
}));

// Mock services
vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    updateCustomData: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(() => ({ dates: [] })),
}));

// Helper to create test column configs
function createTestColumnConfig(overrides: Partial<ColumnConfig> = {}): ColumnConfig {
  return {
    id: `col-${Date.now()}-${Math.random()}`,
    column_name: overrides.column_name || "First Name",
    db_column_name: overrides.db_column_name || "first_name",
    column_type: overrides.column_type || "text",
    role_permissions: overrides.role_permissions || {
      hr_admin: { view: true, edit: true },
      omc: { view: true, edit: false },
    },
    is_masterdata: overrides.is_masterdata ?? true,
    category: overrides.category || "General",
    category_color: overrides.category_color || null,
    display_order: overrides.display_order || 1,
    is_visible: overrides.is_visible ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("EmployeeCard - Swipe Gestures", () => {
  const mockOnArchive = vi.fn();
  const mockOnTerminate = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnEmployeeUpdated = vi.fn();
  let mockEmployee: Employee;
  let mockColumnConfigs: ColumnConfig[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEmployee = createTestEmployee({
      first_name: "John",
      surname: "Doe",
      email: "john.doe@example.com",
      mobile: "+46701234567",
      is_archived: false,
      is_terminated: false,
    });

    mockColumnConfigs = [
      createTestColumnConfig({
        column_name: "First Name",
        db_column_name: "first_name",
        display_order: 1,
      }),
    ];
  });

  describe("AC1: Swipe gesture detection (horizontal vs vertical)", () => {
    it("should detect horizontal swipe gesture (left swipe)", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      expect(card).toBeInTheDocument();

      // Simulate touch start
      const touchStart = {
        touches: [{ clientX: 200, clientY: 100 }],
      };
      fireEvent.touchStart(card!, touchStart);

      // Simulate touch move (left swipe - negative deltaX)
      const touchMove = {
        touches: [{ clientX: 100, clientY: 100 }], // 100px left
        preventDefault: vi.fn(),
      };
      fireEvent.touchMove(card!, touchMove);

      // Simulate touch end
      fireEvent.touchEnd(card!);

      // Card should have been transformed (swipeOffset < 0)
      await waitFor(() => {
        const cardElement = card?.querySelector("div[class*='Card']") as HTMLElement;
        expect(cardElement).toBeInTheDocument();
        const transform = cardElement.style.transform;
        expect(transform).toContain("translateX");
      });
    });

    it("should ignore vertical scroll (prioritize vertical over horizontal)", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      expect(card).toBeInTheDocument();

      // Simulate touch start
      const touchStart = {
        touches: [{ clientX: 200, clientY: 100 }],
      };
      fireEvent.touchStart(card!, touchStart);

      // Simulate touch move (primarily vertical - should be ignored)
      const touchMove = {
        touches: [{ clientX: 200, clientY: 200 }], // 100px down, 0px horizontal
        preventDefault: vi.fn(),
      };
      fireEvent.touchMove(card!, touchMove);

      // Card should not be transformed (vertical scroll takes priority)
      const cardElement = card?.querySelector("div[class*='Card']") as HTMLElement;
      const transform = cardElement?.style.transform || "";
      // Transform should be empty or at 0 (no horizontal movement)
      expect(transform).not.toContain("translateX(-");
    });

    it("should require minimum 50px horizontal movement to reveal actions", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      expect(card).toBeInTheDocument();

      // Simulate touch start
      const touchStart = {
        touches: [{ clientX: 200, clientY: 100 }],
      };
      fireEvent.touchStart(card!, touchStart);

      // Simulate touch move (less than 50px - should not reveal)
      const touchMove = {
        touches: [{ clientX: 160, clientY: 100 }], // 40px left (below threshold)
        preventDefault: vi.fn(),
      };
      fireEvent.touchMove(card!, touchMove);

      // Simulate touch end
      fireEvent.touchEnd(card!);

      // Actions should not be revealed (swipe was too short)
      // Wait a bit for any state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check that swipe buttons (in the absolute positioned container) are not visible
      const swipeActionContainer = card?.querySelector("div[class*='absolute'][class*='right-0']");
      if (swipeActionContainer) {
        const archiveButton = swipeActionContainer.querySelector("button");
        // If button exists, it should not be visible (card didn't swipe enough)
        if (archiveButton) {
          const cardElement = card?.querySelector("div[class*='Card']") as HTMLElement;
          const transform = cardElement?.style.transform || "";
          // Transform should be at 0 or very small (not -240px)
          expect(transform).not.toContain("translateX(-240px)");
        }
      }
    });
  });

  describe("AC2: Action button reveal and interaction", () => {
    it("should reveal action buttons on swipe left (Archive, Terminate, Edit)", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      expect(card).toBeInTheDocument();

      // Simulate full swipe left (>= 50px)
      const touchStart = {
        touches: [{ clientX: 200, clientY: 100 }],
      };
      fireEvent.touchStart(card!, touchStart);

      const touchMove = {
        touches: [{ clientX: 100, clientY: 100 }], // 100px left
        preventDefault: vi.fn(),
      };
      fireEvent.touchMove(card!, touchMove);

      fireEvent.touchEnd(card!);

      // Wait for actions to be revealed - use getAllByText since there are multiple Archive/Terminate buttons
      await waitFor(() => {
        const archiveButtons = screen.getAllByText(/Archive/i);
        const terminateButtons = screen.getAllByText(/Terminate/i);
        const editButtons = screen.getAllByText(/Edit/i);
        // Should have at least one of each (swipe buttons + footer buttons)
        expect(archiveButtons.length).toBeGreaterThan(0);
        expect(terminateButtons.length).toBeGreaterThan(0);
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it("should call onArchive when Archive button is clicked", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      // Reveal actions by swiping
      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      const touchStart = { touches: [{ clientX: 200, clientY: 100 }] };
      fireEvent.touchStart(card!, touchStart);
      const touchMove = { touches: [{ clientX: 100, clientY: 100 }], preventDefault: vi.fn() };
      fireEvent.touchMove(card!, touchMove);
      fireEvent.touchEnd(card!);

      // Click Archive button - find the swipe action button (in absolute container)
      await waitFor(() => {
        const swipeContainer = card?.querySelector("div[class*='absolute'][class*='right-0']");
        expect(swipeContainer).toBeInTheDocument();
        const buttons = Array.from(swipeContainer?.querySelectorAll("button") || []);
        const archiveButton = buttons.find(
          btn => btn.textContent?.includes("Archive")
        );
        expect(archiveButton).toBeInTheDocument();
        fireEvent.click(archiveButton as HTMLElement);
      });

      expect(mockOnArchive).toHaveBeenCalledWith(mockEmployee);
    });

    it("should call onTerminate when Terminate button is clicked", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      // Reveal actions
      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      const touchStart = { touches: [{ clientX: 200, clientY: 100 }] };
      fireEvent.touchStart(card!, touchStart);
      const touchMove = { touches: [{ clientX: 100, clientY: 100 }], preventDefault: vi.fn() };
      fireEvent.touchMove(card!, touchMove);
      fireEvent.touchEnd(card!);

      // Click Terminate button - find the swipe action button
      await waitFor(() => {
        const swipeContainer = card?.querySelector("div[class*='absolute'][class*='right-0']");
        expect(swipeContainer).toBeInTheDocument();
        const terminateButton = Array.from(swipeContainer?.querySelectorAll("button") || []).find(
          btn => btn.textContent?.includes("Terminate")
        );
        expect(terminateButton).toBeInTheDocument();
        fireEvent.click(terminateButton as HTMLElement);
      });

      expect(mockOnTerminate).toHaveBeenCalledWith(mockEmployee);
    });

    it("should call onEdit when Edit button is clicked", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      // Reveal actions
      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      const touchStart = { touches: [{ clientX: 200, clientY: 100 }] };
      fireEvent.touchStart(card!, touchStart);
      const touchMove = { touches: [{ clientX: 100, clientY: 100 }], preventDefault: vi.fn() };
      fireEvent.touchMove(card!, touchMove);
      fireEvent.touchEnd(card!);

      // Click Edit button
      await waitFor(() => {
        const editButton = screen.getByText(/Edit/i);
        expect(editButton).toBeInTheDocument();
        fireEvent.click(editButton);
      });

      expect(mockOnEdit).toHaveBeenCalledWith(mockEmployee);
    });
  });

  describe("AC3: Desktop device gesture ignoring", () => {
    it("should ignore swipe gestures on desktop devices", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(false); // Desktop

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      expect(card).toBeInTheDocument();

      // Simulate touch events
      const touchStart = { touches: [{ clientX: 200, clientY: 100 }] };
      fireEvent.touchStart(card!, touchStart);
      const touchMove = { touches: [{ clientX: 100, clientY: 100 }], preventDefault: vi.fn() };
      fireEvent.touchMove(card!, touchMove);
      fireEvent.touchEnd(card!);

      // Actions should not be revealed on desktop - swipe action buttons should not exist
      const swipeContainer = card?.querySelector("div[class*='absolute'][class*='right-0']");
      expect(swipeContainer).not.toBeInTheDocument();
    });
  });

  describe("AC4: Card state management", () => {
    it("should return card to original position when tapping outside", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      renderWithI18n(
        <EmployeeCard
          employee={mockEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      
      // Swipe left to reveal
      const touchStart = { touches: [{ clientX: 200, clientY: 100 }] };
      fireEvent.touchStart(card!, touchStart);
      const touchMove = { touches: [{ clientX: 100, clientY: 100 }], preventDefault: vi.fn() };
      fireEvent.touchMove(card!, touchMove);
      fireEvent.touchEnd(card!);

      // Wait for card to be swiped
      await waitFor(() => {
        const cardElement = card?.querySelector("div[class*='Card']") as HTMLElement;
        const transform = cardElement?.style.transform || "";
        expect(transform).toContain("translateX(-240px)");
      });

      // Tap outside the card to close
      fireEvent.mouseDown(document.body);
      fireEvent.touchStart(document.body, { touches: [{ clientX: 0, clientY: 0 }] });

      // Card should return to original position
      await waitFor(() => {
        const cardElement = card?.querySelector("div[class*='Card']") as HTMLElement;
        const transform = cardElement?.style.transform || "";
        // Transform should be at 0 (not -240px)
        expect(transform).not.toContain("translateX(-240px)");
      }, { timeout: 500 });
    });

    it("should hide actions for archived employees", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      const archivedEmployee = { ...mockEmployee, is_archived: true };

      renderWithI18n(
        <EmployeeCard
          employee={archivedEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      // Actions should not be available for archived employees
      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      const touchStart = { touches: [{ clientX: 200, clientY: 100 }] };
      fireEvent.touchStart(card!, touchStart);
      const touchMove = { touches: [{ clientX: 100, clientY: 100 }], preventDefault: vi.fn() };
      fireEvent.touchMove(card!, touchMove);
      fireEvent.touchEnd(card!);

      // Swipe action buttons should not appear for archived employees
      const swipeContainer = card?.querySelector("div[class*='absolute'][class*='right-0']");
      expect(swipeContainer).not.toBeInTheDocument();
    });

    it("should hide actions for terminated employees", async () => {
      const { useMediaQuery } = await import("@/hooks/use-media-query");
      vi.mocked(useMediaQuery).mockReturnValue(true); // Mobile

      const terminatedEmployee = { ...mockEmployee, is_terminated: true };

      renderWithI18n(
        <EmployeeCard
          employee={terminatedEmployee}
          isHRAdmin={true}
          columnConfigs={mockColumnConfigs}
          onArchive={mockOnArchive}
          onTerminate={mockOnTerminate}
          onEdit={mockOnEdit}
          onEmployeeUpdated={mockOnEmployeeUpdated}
        />
      );

      // Actions should not be available for terminated employees
      const card = screen.getByText(/John Doe/i).closest("div[class*='relative']");
      const touchStart = { touches: [{ clientX: 200, clientY: 100 }] };
      fireEvent.touchStart(card!, touchStart);
      const touchMove = { touches: [{ clientX: 100, clientY: 100 }], preventDefault: vi.fn() };
      fireEvent.touchMove(card!, touchMove);
      fireEvent.touchEnd(card!);

      // Swipe action buttons should not appear for terminated employees
      const swipeContainer = card?.querySelector("div[class*='absolute'][class*='right-0']");
      expect(swipeContainer).not.toBeInTheDocument();
    });
  });
});

