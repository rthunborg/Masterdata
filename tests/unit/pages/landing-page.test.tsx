import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LandingPage from "@/app/page";

describe("Landing Page", () => {
  it("renders application name", () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/HR Masterdata Management System/i)
    ).toBeInTheDocument();
  });

  it("displays description", () => {
    render(<LandingPage />);
    expect(
      screen.getByText(/Centralized employee data management platform/i)
    ).toBeInTheDocument();
  });

  it("displays login button with correct link", () => {
    render(<LandingPage />);
    const loginButton = screen.getByText(/Login to System/i);
    expect(loginButton).toBeInTheDocument();
    expect(loginButton.closest("a")).toHaveAttribute("href", "/login");
  });

  it("does NOT render System Health button", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/System Health/i)).not.toBeInTheDocument();
  });

  it("displays version number", () => {
    render(<LandingPage />);
    expect(screen.getByText(/Version 1\.00/i)).toBeInTheDocument();
  });
});
