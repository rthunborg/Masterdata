import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ToasterProps } from "sonner";

vi.mock("sonner", () => ({
  Toaster: vi.fn(() => <div data-testid="sonner-toaster" />),
}));

import { Toaster as Sonner } from "sonner";
import { Toaster } from "@/components/ui/toast";

describe("Toaster", () => {
  it("uses red error styling and a longer visible duration for snackbars", () => {
    render(<Toaster />);

    const props = (Sonner as unknown as { mock: { calls: Array<[ToasterProps]> } }).mock
      .calls[0][0];

    expect(props.richColors).toBe(true);
    expect(props.duration).toBeGreaterThanOrEqual(7000);
    expect(props.toastOptions?.classNames?.error).toContain("bg-red");
    expect(props.toastOptions?.classNames?.error).toContain("text-red");
    expect(props.toastOptions?.classNames?.error).toContain("border-red");
  });
});
