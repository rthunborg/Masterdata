/**
 * Shared client-side API error handling.
 *
 * Every frontend service repeated the same pattern:
 *   1. check response.ok
 *   2. parse error JSON
 *   3. branch on status / error.code
 *   4. throw with message (and optionally details)
 *
 * This module centralises that into a single utility so service methods
 * can simply call `await throwOnApiError(response, "fallback")`.
 */

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, string[]>;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Parse an error response and throw an `ApiError`.
 *
 * @param response        The failed fetch Response
 * @param fallbackMessage Used when the body doesn't contain a message
 * @param statusMessages  Optional per-status-code override messages
 *                        (e.g. `{ 403: "Du saknar behörighet…" }`)
 */
export async function throwOnApiError(
  response: Response,
  fallbackMessage: string,
  statusMessages?: Partial<Record<number, string>>
): Promise<void> {
  if (response.ok) return;

  let body: { error?: { code?: string; message?: string; details?: Record<string, string[]> } } = {};
  try {
    body = await response.json();
  } catch {
    // body stays empty – we'll use the fallback
  }

  const code = body.error?.code ?? "UNKNOWN";
  const message =
    statusMessages?.[response.status] ??
    body.error?.message ??
    fallbackMessage;

  throw new ApiError(message, code, response.status, body.error?.details);
}
