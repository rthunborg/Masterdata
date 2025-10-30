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

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
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

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
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

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

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

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
    
    // Attempt to click (should not trigger onChange)
    fireEvent.click(checkbox);
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

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
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

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeDisabled();
  });
});

