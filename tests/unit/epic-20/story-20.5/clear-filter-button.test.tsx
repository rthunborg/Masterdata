import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClearFilterButton } from "@/components/dashboard/ClearFilterButton";


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

describe("ClearFilterButton - Story 20.5", () => {
  it("renders when show is true", () => {
    render(<ClearFilterButton onClick={vi.fn()} show={true} />);
    
    const button = screen.getByTestId("clear-filter-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Rensa filter");
  });

  it("does not render when show is false", () => {
    render(<ClearFilterButton onClick={vi.fn()} show={false} />);
    
    const button = screen.queryByTestId("clear-filter-button");
    expect(button).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<ClearFilterButton onClick={handleClick} show={true} />);
    
    const button = screen.getByTestId("clear-filter-button");
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("has proper accessibility label", () => {
    render(<ClearFilterButton onClick={vi.fn()} show={true} />);
    
    const button = screen.getByTestId("clear-filter-button");
    expect(button).toHaveAttribute("aria-label", "Clear all filters");
  });

  it("displays X icon", () => {
    render(<ClearFilterButton onClick={vi.fn()} show={true} />);
    
    const button = screen.getByTestId("clear-filter-button");
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
