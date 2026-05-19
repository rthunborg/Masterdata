import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("EditableCell confirmed-save behavior", () => {
  it("shows a field spinner and keeps read mode on the confirmed prop until rerender", async () => {
    const save = deferred<void>();
    const onSave = vi.fn().mockReturnValue(save.promise);

    const { rerender } = render(
      <EditableCell
        value="Old"
        employeeId="emp-1"
        field="first_name"
        type="text"
        canEdit={true}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole("gridcell"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "New" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("emp-1", "first_name", "New");
    });

    expect(screen.getByRole("status", { name: "Sparar" })).toBeInTheDocument();

    await act(async () => {
      save.resolve();
      await save.promise;
    });

    expect(screen.getByRole("gridcell")).toHaveTextContent("Old");

    rerender(
      <EditableCell
        value="New"
        employeeId="emp-1"
        field="first_name"
        type="text"
        canEdit={true}
        onSave={onSave}
      />
    );

    expect(screen.getByRole("gridcell")).toHaveTextContent("New");
  });

  it("reverts a failed text save to the confirmed original value", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Save failed"));
    const onError = vi.fn();

    render(
      <EditableCell
        value="Old"
        employeeId="emp-1"
        field="first_name"
        type="text"
        canEdit={true}
        onSave={onSave}
        onError={onError}
      />
    );

    fireEvent.click(screen.getByRole("gridcell"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "New" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Save failed");
    });

    expect(screen.getByRole("gridcell")).toHaveTextContent("Old");
  });
});
