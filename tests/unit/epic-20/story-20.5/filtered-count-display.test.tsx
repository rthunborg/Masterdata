import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilteredCountDisplay } from "@/components/dashboard/FilteredCountDisplay";

describe("FilteredCountDisplay - Story 20.5", () => {
  it("renders when show is true", () => {
    render(
      <FilteredCountDisplay 
        filteredCount={10} 
        totalCount={50} 
        show={true} 
      />
    );
    
    const display = screen.getByTestId("filtered-count-display");
    expect(display).toBeInTheDocument();
    expect(display).toHaveTextContent("Showing 10 of 50 employees");
  });

  it("does not render when show is false", () => {
    render(
      <FilteredCountDisplay 
        filteredCount={10} 
        totalCount={50} 
        show={false} 
      />
    );
    
    const display = screen.queryByTestId("filtered-count-display");
    expect(display).not.toBeInTheDocument();
  });

  it("displays correct counts with emphasis on filtered count", () => {
    render(
      <FilteredCountDisplay 
        filteredCount={5} 
        totalCount={100} 
        show={true} 
      />
    );
    
    const display = screen.getByTestId("filtered-count-display");
    const emphasizedCount = display.querySelector("span.font-medium");
    
    expect(emphasizedCount).toBeInTheDocument();
    expect(emphasizedCount).toHaveTextContent("5");
    expect(display).toHaveTextContent("of 100 employees");
  });

  it("handles zero filtered count", () => {
    render(
      <FilteredCountDisplay 
        filteredCount={0} 
        totalCount={50} 
        show={true} 
      />
    );
    
    const display = screen.getByTestId("filtered-count-display");
    expect(display).toHaveTextContent("Showing 0 of 50 employees");
  });

  it("handles equal filtered and total counts", () => {
    render(
      <FilteredCountDisplay 
        filteredCount={25} 
        totalCount={25} 
        show={true} 
      />
    );
    
    const display = screen.getByTestId("filtered-count-display");
    expect(display).toHaveTextContent("Showing 25 of 25 employees");
  });
});
