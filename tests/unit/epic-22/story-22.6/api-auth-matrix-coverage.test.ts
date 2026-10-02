import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const apiRoot = join(repoRoot, "src", "app", "api");
const apiAuthMatrixPath = join(
  repoRoot,
  "docs",
  "commercial-readiness",
  "19_api_auth_matrix.md"
);

const supportedHttpMethods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
] as const;

const accessClasses = [
  "public-by-design",
  "authenticated",
  "role-restricted",
  "hr-admin-only",
  "employee-manager",
  "cron-secret",
  "self-service-auth",
] as const;

const evidenceStatuses = [
  "verified",
  "verified-with-follow-up",
  "risk-flagged",
  "public-by-design",
  "cron-secret",
] as const;

type SupportedHttpMethod = (typeof supportedHttpMethods)[number];

type RouteMethod = {
  method: SupportedHttpMethod;
  routePath: string;
  sourcePath: string;
};

type ApiMatrixRow = {
  accessClass: string;
  evidenceStatus: string;
  method: string;
  routePath: string;
  sourceFile: string;
};

function listRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listRouteFiles(absolutePath);
    }

    return entry.isFile() && entry.name === "route.ts" ? [absolutePath] : [];
  });
}

function toRoutePath(routeFile: string): string {
  const routeDirectory = dirname(routeFile);
  const segments = relative(apiRoot, routeDirectory)
    .split(sep)
    .filter(Boolean);

  return ["/api", ...segments].join("/");
}

function toProjectPath(absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join("/");
}

function exportedMethods(source: string): SupportedHttpMethod[] {
  return supportedHttpMethods.filter((method) => {
    const declaration = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`
    );
    const variable = new RegExp(
      `export\\s+const\\s+${method}(?:\\s*:\\s*[^=]+)?\\s*=`
    );
    const exportList = /export\s*\{([^}]*)\}/g;
    const hasReexport = Array.from(source.matchAll(exportList)).some((match) =>
      match[1]
        .split(",")
        .map((specifier) => specifier.trim())
        .some(
          (specifier) =>
            specifier === method || specifier.endsWith(` as ${method}`)
        )
    );

    return declaration.test(source) || variable.test(source) || hasReexport;
  });
}

function currentRouteMethods(): RouteMethod[] {
  return listRouteFiles(apiRoot)
    .flatMap((routeFile) => {
      const source = readFileSync(routeFile, "utf8");
      const routePath = toRoutePath(routeFile);
      const sourcePath = toProjectPath(routeFile);

      return exportedMethods(source).map((method) => ({
        method,
        routePath,
        sourcePath,
      }));
    })
    .sort((left, right) =>
      `${left.routePath} ${left.method}`.localeCompare(
        `${right.routePath} ${right.method}`
      )
    );
}

function parseMarkdownTableLine(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function stripInlineCode(value: string): string {
  return value.replace(/^`/, "").replace(/`$/, "");
}

function parseRouteMatrixRows(matrix: string): ApiMatrixRow[] {
  const lines = matrix.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.startsWith("| Route path | Method | Source file |")
  );

  if (headerIndex === -1) {
    throw new Error("API auth matrix route table header was not found");
  }

  const rows: ApiMatrixRow[] = [];

  for (const line of lines.slice(headerIndex + 1)) {
    if (!line.startsWith("|")) {
      break;
    }

    const cells = parseMarkdownTableLine(line);

    if (cells.every((cell) => /^-+$/.test(cell))) {
      continue;
    }

    if (cells.length !== 11) {
      throw new Error(`Expected 11 API matrix columns, found ${cells.length}: ${line}`);
    }

    rows.push({
      routePath: cells[0],
      method: cells[1],
      sourceFile: stripInlineCode(cells[2]),
      accessClass: cells[4],
      evidenceStatus: cells[9],
    });
  }

  return rows;
}

function matchingMatrixRows(
  matrixRows: ApiMatrixRow[],
  routeMethod: RouteMethod
): ApiMatrixRow[] {
  return matrixRows.filter(
    (row) =>
      row.routePath === routeMethod.routePath &&
      row.method === routeMethod.method &&
      row.sourceFile === routeMethod.sourcePath
  );
}

describe("Story 22.6 API auth matrix route inventory coverage", () => {
  it("lists every exported API route method with access class and evidence status", () => {
    expect(
      existsSync(apiAuthMatrixPath),
      "docs/commercial-readiness/19_api_auth_matrix.md should exist"
    ).toBe(true);

    const matrix = readFileSync(apiAuthMatrixPath, "utf8");
    const matrixRows = parseRouteMatrixRows(matrix);
    const routeMethods = currentRouteMethods();
    const currentRouteMethodKeys = new Set(
      routeMethods.map(
        (routeMethod) =>
          `${routeMethod.method} ${routeMethod.routePath} (${routeMethod.sourcePath})`
      )
    );
    const missingRows: string[] = [];
    const staleRows: string[] = [];
    const duplicateRows: string[] = [];
    const incompleteRows: ApiMatrixRow[] = [];
    const seenMatrixRowKeys = new Set<string>();

    for (const routeMethod of routeMethods) {
      const rows = matchingMatrixRows(matrixRows, routeMethod);

      if (rows.length === 0) {
        missingRows.push(
          `${routeMethod.method} ${routeMethod.routePath} (${routeMethod.sourcePath})`
        );
        continue;
      }

      for (const row of rows) {
        const hasAccessClass = accessClasses.includes(
          row.accessClass as (typeof accessClasses)[number]
        );
        const hasEvidenceStatus = evidenceStatuses.includes(
          row.evidenceStatus as (typeof evidenceStatuses)[number]
        );

        if (!hasAccessClass || !hasEvidenceStatus) {
          incompleteRows.push(row);
        }
      }
    }

    for (const row of matrixRows) {
      const rowKey = `${row.method} ${row.routePath} (${row.sourceFile})`;

      if (!currentRouteMethodKeys.has(rowKey)) {
        staleRows.push(rowKey);
      }

      if (seenMatrixRowKeys.has(rowKey)) {
        duplicateRows.push(rowKey);
      }

      seenMatrixRowKeys.add(rowKey);
    }

    expect(missingRows).toEqual([]);
    expect(staleRows).toEqual([]);
    expect(duplicateRows).toEqual([]);
    expect(incompleteRows).toEqual([]);
  });
});
