import { afterEach, describe, expect, it, vi } from "vitest";

import { columnService } from "@/lib/services/column-service";

/**
 * Regression guard for the delete-column refresh bug.
 *
 * `GET /api/columns` is served with a `stale-while-revalidate` Cache-Control, and
 * `columnService.getAll` is what `useColumns().refetch()` calls right after a
 * create/update/delete mutation. If that fetch used the browser cache it could
 * return the stale pre-mutation list for minutes, so the UI would keep showing a
 * column that was just deleted. `getAll` must therefore fetch with
 * `cache: "no-store"`.
 */
describe("columnService.getAll cache behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the columns list with caching disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await columnService.getAll();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/columns");
    expect(options).toMatchObject({ cache: "no-store" });
  });

  it("passes the preview role param and still disables caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await columnService.getAll("sodexo");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/columns?role=sodexo");
    expect(options).toMatchObject({ cache: "no-store" });
  });
});
