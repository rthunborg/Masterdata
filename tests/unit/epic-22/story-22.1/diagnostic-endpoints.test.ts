import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const diagnosticRoutes = [
  {
    label: "GET /api/test-db",
    pathname: "/api/test-db",
  },
  {
    label: "GET /api/debug/auth-status",
    pathname: "/api/debug/auth-status",
  },
];

const sensitiveDiagnosticKeys = [
  "supabaseUrl",
  "hasServiceKey",
  "userId",
  "userEmail",
  "userRole",
  "cookieHeader",
  "supabaseCookieNames",
  "details",
  "stack",
  "environment",
  "NODE_ENV",
  "hasAnonKey",
  "hasSupabaseUrl",
  "hasAuthUser",
  "dbErrorDetails",
  "data",
  "success",
  "columnCount",
];

function filePathFromImportMetaUrl(metaUrl: string): string {
  const url = new URL(metaUrl);

  if (url.protocol === "file:") {
    return fileURLToPath(url);
  }

  const fsPathPrefix = "/@fs/";
  const fsPathIndex = url.pathname.indexOf(fsPathPrefix);

  if (fsPathIndex >= 0) {
    return decodeURIComponent(
      url.pathname.slice(fsPathIndex + fsPathPrefix.length)
    );
  }

  throw new Error(`Cannot resolve test file path from ${metaUrl}`);
}

const repoRoot = resolve(
  dirname(filePathFromImportMetaUrl(import.meta.url)),
  "../../../.."
);
const appRoot = join(repoRoot, "src", "app");
const apiRoot = join(appRoot, "api");
const routeFileNamePattern = /^route\.(?:cjs|js|jsx|mjs|ts|tsx)$/;

function toProjectPath(absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join("/");
}

function listRouteHandlerFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = readdirSync(directory, { withFileTypes: true });
  const routeFiles: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      routeFiles.push(...listRouteHandlerFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && routeFileNamePattern.test(entry.name)) {
      routeFiles.push(absolutePath);
    }
  }

  return routeFiles;
}

function isPathlessSegment(segment: string): boolean {
  return (
    segment.startsWith("(") && segment.endsWith(")")
  ) || segment.startsWith("@");
}

function routeSegments(routeFile: string): string[] {
  return relative(appRoot, dirname(routeFile))
    .split(sep)
    .filter((segment) => segment.length > 0 && !isPathlessSegment(segment));
}

function pathnameSegments(pathname: string): string[] {
  return pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
}

function routeMatchesPathname(routeFile: string, pathname: string): boolean {
  const route = routeSegments(routeFile);
  const target = pathnameSegments(pathname);
  let targetIndex = 0;

  for (const segment of route) {
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) {
      return true;
    }

    if (/^\[\.\.\.[^\]]+\]$/.test(segment)) {
      return targetIndex < target.length;
    }

    if (targetIndex >= target.length) {
      return false;
    }

    if (/^\[[^\]]+\]$/.test(segment) || segment === target[targetIndex]) {
      targetIndex += 1;
      continue;
    }

    return false;
  }

  return targetIndex === target.length;
}

function routeHandlersFor(pathname: string): string[] {
  return listRouteHandlerFiles(apiRoot)
    .filter((routeFile) => routeMatchesPathname(routeFile, pathname))
    .map(toProjectPath)
    .sort();
}

function sensitiveKeysInSource(source: string): string[] {
  return sensitiveDiagnosticKeys.filter((field) => {
    const quotedKey = new RegExp(`["']${field}["']\\s*:`);
    const objectKey = new RegExp(`\\b${field}\\s*:`);

    return quotedKey.test(source) || objectKey.test(source);
  });
}

describe("Story 22.1 diagnostic endpoint removal", () => {
  it.each(diagnosticRoutes)(
    "removes route handlers that could serve $label",
    ({ pathname }) => {
      expect(routeHandlersFor(pathname)).toEqual([]);
    }
  );

  it("does not leave diagnostic files containing sensitive response keys at the removed paths", () => {
    for (const routePath of [
      join(apiRoot, "test-db"),
      join(apiRoot, "debug", "auth-status"),
    ]) {
      if (!existsSync(routePath) || !statSync(routePath).isDirectory()) {
        continue;
      }

      for (const routeFile of listRouteHandlerFiles(routePath)) {
        const source = readFileSync(routeFile, "utf8");

        expect(sensitiveKeysInSource(source)).toEqual([]);
      }
    }
  });

  it("keeps the public health route in place without diagnostic response keys", () => {
    const healthRouteFile = join(apiRoot, "health", "route.ts");
    const healthSource = readFileSync(healthRouteFile, "utf8");

    expect(routeHandlersFor("/api/health")).toEqual([
      "src/app/api/health/route.ts",
    ]);
    expect(healthSource).toMatch(/export\s+async\s+function\s+GET\s*\(/);
    expect(sensitiveKeysInSource(healthSource)).toEqual([]);
  });

  it("keeps the health route on the explicit public middleware allowlist", () => {
    const middlewareSource = readFileSync(join(repoRoot, "middleware.ts"), "utf8");

    expect(middlewareSource).toContain("/api/health");
  });
});
