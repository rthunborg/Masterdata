import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUIStore } from "@/lib/store/ui-store";
import { UserRole } from "@/lib/types/user";

/**
 * Integration Tests for Role Preview Mode
 * 
 * Tests the integration between UI store, role selector, and preview banner
 * to ensure the preview mode workflow functions correctly.
 */
describe("Role Preview Integration", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.setPreviewRole(null);
    });
  });

  it("switches to preview mode when role is selected", () => {
    const { result } = renderHook(() => useUIStore());

    // Initially not in preview mode
    expect(result.current.isPreviewMode).toBe(false);
    expect(result.current.previewRole).toBe(null);

    // Select Sodexo role for preview
    act(() => {
      result.current.setPreviewRole(UserRole.SODEXO);
    });

    // Should now be in preview mode
    expect(result.current.isPreviewMode).toBe(true);
    expect(result.current.previewRole).toBe(UserRole.SODEXO);
  });

  it("exits preview mode when setPreviewRole(null) is called", () => {
    const { result } = renderHook(() => useUIStore());

    // Enter preview mode
    act(() => {
      result.current.setPreviewRole(UserRole.OMC);
    });

    expect(result.current.isPreviewMode).toBe(true);

    // Exit preview mode
    act(() => {
      result.current.setPreviewRole(null);
    });

    expect(result.current.isPreviewMode).toBe(false);
    expect(result.current.previewRole).toBe(null);
  });

  it("allows switching between different preview roles", () => {
    const { result } = renderHook(() => useUIStore());

    // Preview as Sodexo
    act(() => {
      result.current.setPreviewRole(UserRole.SODEXO);
    });
    expect(result.current.previewRole).toBe(UserRole.SODEXO);

    // Switch to OMC
    act(() => {
      result.current.setPreviewRole(UserRole.OMC);
    });
    expect(result.current.previewRole).toBe(UserRole.OMC);
    expect(result.current.isPreviewMode).toBe(true);

    // Switch to Payroll
    act(() => {
      result.current.setPreviewRole(UserRole.PAYROLL);
    });
    expect(result.current.previewRole).toBe(UserRole.PAYROLL);
    expect(result.current.isPreviewMode).toBe(true);
  });

  it("maintains preview state across multiple operations", () => {
    const { result } = renderHook(() => useUIStore());

    // Enter preview mode
    act(() => {
      result.current.setPreviewRole(UserRole.TOPLUX);
    });

    // Perform other UI store operations (open modal)
    act(() => {
      result.current.openModal("addEmployee");
    });

    // Preview mode should still be active
    expect(result.current.isPreviewMode).toBe(true);
    expect(result.current.previewRole).toBe(UserRole.TOPLUX);
    expect(result.current.modals.addEmployee).toBe(true);

    // Close modal
    act(() => {
      result.current.closeModal("addEmployee");
    });

    // Preview mode should still be active
    expect(result.current.isPreviewMode).toBe(true);
    expect(result.current.previewRole).toBe(UserRole.TOPLUX);
  });

  it("correctly sets isPreviewMode based on previewRole value", () => {
    const { result } = renderHook(() => useUIStore());

    // Test with each role
    const testRoles = [
      UserRole.SODEXO,
      UserRole.OMC,
      UserRole.PAYROLL,
      UserRole.TOPLUX,
    ];

    testRoles.forEach((role) => {
      act(() => {
        result.current.setPreviewRole(role);
      });
      expect(result.current.isPreviewMode).toBe(true);
      expect(result.current.previewRole).toBe(role);
    });

    // Exit preview
    act(() => {
      result.current.setPreviewRole(null);
    });
    expect(result.current.isPreviewMode).toBe(false);
  });
});
