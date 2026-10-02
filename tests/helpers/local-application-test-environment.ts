const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
export const LOCAL_APPLICATION_BASE_URL_ENV =
  "HR_ADMIN_EXPORT_APP_BASE_URL";

function normalizedHostname(url: URL) {
  return url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

/**
 * Resolve an explicitly configured local application origin for live HTTP tests.
 *
 * Missing configuration returns null so callers can declare an environment skip.
 * Any supplied but unsafe value fails closed instead of silently redirecting a
 * mutating integration test to a remote application.
 */
export function resolveLocalApplicationBaseUrl(rawUrl: string | undefined) {
  const candidate = rawUrl?.trim();
  if (!candidate) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      `${LOCAL_APPLICATION_BASE_URL_ENV} must be an explicit loopback ` +
        "application URL with an HTTP port"
    );
  }

  const isSafeOrigin =
    parsed.protocol === "http:" &&
    LOOPBACK_HOSTS.has(normalizedHostname(parsed)) &&
    parsed.port.length > 0 &&
    parsed.username.length === 0 &&
    parsed.password.length === 0 &&
    parsed.pathname === "/" &&
    parsed.search.length === 0 &&
    parsed.hash.length === 0;

  if (!isSafeOrigin) {
    throw new Error(
      `${LOCAL_APPLICATION_BASE_URL_ENV} must be an explicit loopback ` +
        "application URL with an HTTP port"
    );
  }

  return parsed.origin;
}

export function buildLocalApplicationUrl(baseUrl: string, pathname: string) {
  const safeBaseUrl = resolveLocalApplicationBaseUrl(baseUrl);
  if (!safeBaseUrl) {
    throw new Error(
      `${LOCAL_APPLICATION_BASE_URL_ENV} is required for live application HTTP tests`
    );
  }
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\")
  ) {
    throw new Error("Local application test paths must be origin-relative");
  }

  const resolved = new URL(pathname, `${safeBaseUrl}/`);
  if (resolved.origin !== safeBaseUrl) {
    throw new Error("Local application test paths must preserve the origin");
  }

  return resolved.toString();
}
