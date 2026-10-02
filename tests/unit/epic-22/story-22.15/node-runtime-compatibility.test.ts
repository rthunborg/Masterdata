import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const eslintRequire = createRequire(require.resolve("eslint"));
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const semver = eslintRequire("semver") as {
  subset(range: string, requirement: string): boolean;
  satisfies(version: string, range: string): boolean;
};
const project = JSON.parse(readFileSync("package.json", "utf8")) as {
  engines: { node: string };
};
const packages = ["next", "@vitejs/plugin-react", "jsdom", "vitest", "nodemailer"];

describe("declared Node runtime compatibility", () => {
  it("admits only versions supported by every locked application and test runtime", () => {
    const manifests = packages.map((name) => JSON.parse(
      readFileSync(resolve("node_modules", name, "package.json"), "utf8")
    ) as { name: string; engines: { node: string } });
    manifests.push(vitestRequire("vite/package.json"));
    for (const manifest of manifests) {
      expect(semver.subset(project.engines.node, manifest.engines.node), manifest.name).toBe(true);
    }
  });

  it("documents supported boundaries and excludes unsupported intervening majors", () => {
    for (const version of ["20.19.0", "20.99.0", "22.12.0", "22.99.0", "24.0.0", "25.0.0"]) {
      expect(semver.satisfies(version, project.engines.node), version).toBe(true);
    }
    for (const version of ["18.20.0", "20.9.0", "20.18.3", "21.7.3", "22.11.0", "23.11.0"]) {
      expect(semver.satisfies(version, project.engines.node), version).toBe(false);
    }
    expect(readFileSync("README.md", "utf8")).toContain(project.engines.node);
  });
});