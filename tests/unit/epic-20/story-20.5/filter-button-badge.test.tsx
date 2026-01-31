import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterButton } from "@/components/dashboard/FilterPanel/FilterButton";

describe("FilterButton Badge - Story 20.5", () => {
  it("shows no badge when filterCount is 0", () => {
    render(<FilterButton onClick={vi.fn()} isActive={false} filterCount={0} />);
    
    const badge = screen.queryByTestId("filter-count-badge");
    expect(badge).not.toBeInTheDocument();
  });

  it("shows badge with count when filters active", () => {
    render(<FilterButton onClick={vi.fn()} isActive={true} filterCount={3} />);
    
    const badge = screen.getByTestId("filter-count-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("3");
  });

  it("has primary styling when active", () => {
    render(<FilterButton onClick={vi.fn()} isActive={true} filterCount={2} />);
    
    const button = screen.getByTestId("filter-button");
    expect(button).toHaveClass("border-primary");
    expect(button).toHaveClass("bg-primary/5");
  });

  it("has outline variant when inactive", () => {
    render(<FilterButton onClick={vi.fn()} isActive={false} filterCount={0} />);
    
    const button = screen.getByTestId("filter-button");
    expect(button).not.toHaveClass("border-primary");
  });

  it("updates badge count in real-time", () => {
    const { rerender } = render(
      <FilterButton onClick={vi.fn()} isActive={true} filterCount={1} />
    );
    
    expect(screen.getByTestId("filter-count-badge")).toHaveTextContent("1");
    
    rerender(<FilterButton onClick={vi.fn()} isActive={true} filterCount={5} />);
    
    expect(screen.getByTestId("filter-count-badge")).toHaveTextContent("5");
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<FilterButton onClick={handleClick} isActive={false} filterCount={0} />);
    
    const button = screen.getByTestId("filter-button");
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("displays '9+' when filter count exceeds 9", () => {
    render(<FilterButton onClick={vi.fn()} isActive={true} filterCount={10} />);
    
    const badge = screen.getByTestId("filter-count-badge");
    expect(badge).toHaveTextContent("9+");
  });

  it("displays exact count when 9 or fewer", () => {
    render(<FilterButton onClick={vi.fn()} isActive={true} filterCount={9} />);
    
    const badge = screen.getByTestId("filter-count-badge");
    expect(badge).toHaveTextContent("9");
  });
});
