/**
 * Form Test Helpers
 * Story 11.10: PE3 Validation & UI Component Tests
 * Task 7: Test Utilities and Helpers
 * 
 * Reusable helper functions for form testing
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RenderResult } from "@testing-library/react";

/**
 * Render form with validation context and return user event setup
 */
export async function renderFormWithValidation(
  component: React.ReactElement
): Promise<{ user: ReturnType<typeof userEvent.setup>; result: RenderResult }> {
  const { renderWithI18n } = await import("@/../tests/utils/i18n-test-wrapper");
  const { render } = await import("@testing-library/react");
  
  const result = renderWithI18n(component);
  const user = userEvent.setup();
  
  return { user, result };
}

/**
 * Submit form and wait for validation to complete
 * Returns whether submission was successful
 */
export async function submitFormAndWaitForValidation(
  submitButtonText: string | RegExp = /submit|save|skapa|spara/i
): Promise<{ success: boolean; errors: string[] }> {
  const submitButton = screen.getByRole("button", { name: submitButtonText });
  const user = userEvent.setup();
  
  await user.click(submitButton);
  
  // Wait for validation to complete
  await waitFor(() => {
    // Check if form submitted successfully (no validation errors visible)
    const errorMessages = screen.queryAllByRole("alert");
    const formErrors = screen.queryAllByText(/required|error|invalid|obligatorisk|ogiltig/i);
    
    return errorMessages.length === 0 && formErrors.length === 0;
  }, { timeout: 2000 }).catch(() => {
    // Validation errors found
  });
  
  const errorMessages = screen.queryAllByRole("alert");
  const formErrors = screen.queryAllByText(/required|error|invalid|obligatorisk|ogiltig/i);
  const allErrors = [
    ...errorMessages.map(el => el.textContent || ''),
    ...formErrors.map(el => el.textContent || ''),
  ].filter(Boolean);
  
  return {
    success: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Assert that form fields appear in the correct order
 */
export function assertFieldOrder(
  fieldLabels: string[],
  options: { caseSensitive?: boolean } = {}
): void {
  const { caseSensitive = false } = options;
  
  // Get all form items
  const form = screen.getByRole("form") || document.querySelector("form");
  if (!form) {
    throw new Error("No form found in document");
  }
  
  const formItems = Array.from(form.querySelectorAll('[data-slot="form-item"]'));
  
  const fieldIndices: number[] = [];
  
  fieldLabels.forEach((label) => {
    const index = formItems.findIndex((item) => {
      const labelElement = item.querySelector("label");
      const labelText = labelElement?.textContent || "";
      return caseSensitive
        ? labelText.includes(label)
        : labelText.toLowerCase().includes(label.toLowerCase());
    });
    
    if (index === -1) {
      throw new Error(`Field with label "${label}" not found`);
    }
    
    fieldIndices.push(index);
  });
  
  // Verify order: each field should come after the previous one
  for (let i = 1; i < fieldIndices.length; i++) {
    expect(fieldIndices[i]).toBeGreaterThan(fieldIndices[i - 1]);
  }
}

/**
 * Assert that a validation error is displayed for a specific field
 */
export async function assertValidationError(
  fieldLabel: string | RegExp,
  expectedError?: string | RegExp
): Promise<void> {
  const field = typeof fieldLabel === 'string'
    ? screen.getByLabelText(new RegExp(fieldLabel, 'i'))
    : screen.getByLabelText(fieldLabel);
  
  // Find the form item container
  const formItem = field.closest('[data-slot="form-item"]');
  expect(formItem).toBeTruthy();
  
  // Look for error message in the form item
  const errorMessage = formItem?.querySelector('[role="alert"], .text-destructive, [class*="error"]');
  
  if (expectedError) {
    const errorText = errorMessage?.textContent || '';
    if (typeof expectedError === 'string') {
      expect(errorText.toLowerCase()).toContain(expectedError.toLowerCase());
    } else {
      expect(errorText).toMatch(expectedError);
    }
  } else {
    expect(errorMessage).toBeTruthy();
  }
}

/**
 * Mock date/time input for testing
 */
export async function mockDateTimeInput(
  dateField: HTMLElement,
  timeField: HTMLElement | null,
  date: string,
  time?: string
): Promise<void> {
  const user = userEvent.setup();
  
  // Clear and type date
  if (dateField instanceof HTMLInputElement) {
    await user.clear(dateField);
    await user.type(dateField, date);
  }
  
  // Clear and type time if provided
  if (timeField && time) {
    if (timeField instanceof HTMLInputElement) {
      await user.clear(timeField);
      await user.type(timeField, time);
    }
  }
  
  // Wait for any auto-population or validation
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Helper to wait for form field to appear (useful for conditional fields)
 */
export async function waitForFormField(
  label: string | RegExp,
  options: { timeout?: number } = {}
): Promise<HTMLElement> {
  const { timeout = 3000 } = options;
  
  return await waitFor(
    () => {
      const field = typeof label === 'string'
        ? screen.getByLabelText(new RegExp(label, 'i'))
        : screen.getByLabelText(label);
      return field;
    },
    { timeout }
  );
}

/**
 * Helper to check if a field is visible (for conditional rendering tests)
 */
export function isFieldVisible(label: string | RegExp): boolean {
  try {
    const field = typeof label === 'string'
      ? screen.getByLabelText(new RegExp(label, 'i'))
      : screen.getByLabelText(label);
    return field !== null && field.offsetParent !== null;
  } catch {
    return false;
  }
}

/**
 * Helper to get field value
 */
export function getFieldValue(label: string | RegExp): string | boolean | null {
  const field = typeof label === 'string'
    ? screen.getByLabelText(new RegExp(label, 'i'))
    : screen.getByLabelText(label);
  
  if (field instanceof HTMLInputElement) {
    if (field.type === 'checkbox') {
      return field.checked;
    }
    return field.value;
  }
  
  if (field instanceof HTMLSelectElement) {
    return field.value;
  }
  
  if (field instanceof HTMLTextAreaElement) {
    return field.value;
  }
  
  return null;
}

/**
 * Helper to set field value
 */
export async function setFieldValue(
  label: string | RegExp,
  value: string | boolean
): Promise<void> {
  const user = userEvent.setup();
  const field = typeof label === 'string'
    ? screen.getByLabelText(new RegExp(label, 'i'))
    : screen.getByLabelText(label);
  
  if (field instanceof HTMLInputElement) {
    if (field.type === 'checkbox') {
      const currentValue = field.checked;
      if (currentValue !== value) {
        await user.click(field);
      }
    } else {
      await user.clear(field);
      await user.type(field, value as string);
    }
  } else if (field instanceof HTMLSelectElement) {
    await user.selectOptions(field, value as string);
  } else if (field instanceof HTMLTextAreaElement) {
    await user.clear(field);
    await user.type(field, value as string);
  }
}

