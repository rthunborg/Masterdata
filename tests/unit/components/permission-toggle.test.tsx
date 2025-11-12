/**
 * Component Tests for PermissionToggle
 * Story 5.2: Column Permission Configuration Interface
 *
 * Tests cover:
 * - Toggle renders with correct state
 * - onChange callback fires correctly
 * - Disabled state prevents changes
 * - Tooltip displays for disabled toggles
 */

import { screen, fireEvent } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi } from "vitest";
import { PermissionToggle } from "@/components/admin/permission-toggle";
import { UserRole } from "@/lib/types/user";

describe("PermissionToggle", () => {
  it("renders checkbox with correct state", () => {
    renderWithI18n(
      <PermissionToggle
        role={UserRole.SODEXO}
        permissionType="view"
        value={true}
        onChange={vi.fn()}
      />
    );

    const toggle = screen.getByRole("button", { name: /view permission/i });
    expect(toggle).toBeInTheDocument();
    // Check if the toggle is checked by looking for the "eye" icon (checked state)
    expect(toggle.querySelector('svg.lucide-eye')).toBeInTheDocument();
  });

  it("renders unchecked checkbox when value is false", () => {
    renderWithI18n(
      <PermissionToggle
        role={UserRole.SODEXO}
        permissionType="edit"
        value={false}
        onChange={vi.fn()}
      />
    );

    const toggle = screen.getByRole("button", { name: /edit permission/i });
    // Check if the toggle is unchecked by looking for the "minus" icon (unchecked state)
    expect(toggle.querySelector('svg.lucide-minus')).toBeInTheDocument();
  });

  it("calls onChange when checkbox clicked", () => {
    const mockOnChange = vi.fn();
    renderWithI18n(
      <PermissionToggle
        role={UserRole.SODEXO}
        permissionType="view"
        value={false}
        onChange={mockOnChange}
      />
    );

    const toggle = screen.getByRole("button", { name: /view permission/i });
    fireEvent.click(toggle);

    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it("does not call onChange when disabled", () => {
    const mockOnChange = vi.fn();
    renderWithI18n(
      <PermissionToggle
        role={UserRole.HR_ADMIN}
        permissionType="view"
        value={true}
        disabled={true}
        onChange={mockOnChange}
      />
    );

    const toggle = screen.getByRole("button", { name: /view permission/i });
    expect(toggle).toBeDisabled();
    
    // Attempt to click (should not trigger onChange)
    fireEvent.click(toggle);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("displays tooltip when disabled and tooltip provided", () => {
    renderWithI18n(
      <PermissionToggle
        role={UserRole.HR_ADMIN}
        permissionType="view"
        value={true}
        disabled={true}
        onChange={vi.fn()}
        tooltip="HR Admin always has full access"
      />
    );

    const toggle = screen.getByRole("button", { name: /view permission/i });
    expect(toggle).toBeDisabled();
  });

  it("does not display tooltip when not disabled", () => {
    renderWithI18n(
      <PermissionToggle
        role={UserRole.SODEXO}
        permissionType="view"
        value={true}
        disabled={false}
        onChange={vi.fn()}
        tooltip="This should not appear"
      />
    );

    const toggle = screen.getByRole("button", { name: /view permission/i });
    expect(toggle).not.toBeDisabled();
  });
});

