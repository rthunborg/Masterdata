import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEmployeeTableActions } from "@/lib/hooks/use-employee-table-actions";
import { employeeService } from "@/lib/services/employee-service";
import type { Employee } from "@/lib/types/employee";

vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    updateCustomData: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => key,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("useEmployeeTableActions", () => {
  const onOptimisticUpdate = vi.fn();

  function renderActions() {
    return renderHook(() =>
      useEmployeeTableActions({
        onEmployeeUpdated: vi.fn(),
        onOptimisticUpdate,
        bumpStats: vi.fn(),
        filteredEmployees: [],
        selectedEmployeeIds: new Set(),
        clearSelection: vi.fn(),
      })
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not apply a checklist field update before the API confirms it saved", async () => {
    const { result } = renderActions();
    const update = deferred<Employee>();
    vi.mocked(employeeService.update).mockReturnValue(update.promise);

    let savePromise!: Promise<void>;
    await act(async () => {
      savePromise = result.current.handleMasterdataUpdate(
        "emp-1",
        "seably_prm",
        true
      );
      await Promise.resolve();
    });

    expect(employeeService.update).toHaveBeenCalledWith("emp-1", {
      seably_prm: true,
    });
    expect(onOptimisticUpdate).not.toHaveBeenCalled();

    await act(async () => {
      update.resolve({ id: "emp-1", seably_prm: true } as Employee & {
        seably_prm: boolean;
      });
      await savePromise;
    });

    expect(onOptimisticUpdate).toHaveBeenCalledWith("emp-1", {
      seably_prm: true,
    });
  });

  it("does not apply a checklist field update when the API rejects the save", async () => {
    const { result } = renderActions();
    vi.mocked(employeeService.update).mockRejectedValue(new Error("Save failed"));

    await expect(
      result.current.handleMasterdataUpdate("emp-1", "seably_prm", true)
    ).rejects.toThrow("Save failed");

    expect(onOptimisticUpdate).not.toHaveBeenCalled();
  });

  it("does not locally complete a checklist field when the API response does not include that field", async () => {
    const { result } = renderActions();
    vi.mocked(employeeService.update).mockResolvedValue({
      id: "emp-1",
    } as Employee);

    await result.current.handleMasterdataUpdate("emp-1", "seably_prm", true);

    expect(onOptimisticUpdate).not.toHaveBeenCalled();
  });
});
