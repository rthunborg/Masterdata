import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const readinessRoot = resolve(repoRoot, "docs/commercial-readiness");
const auditEvidencePath = resolve(
  readinessRoot,
  "evidence/dependency-audit-2026-08-31.md"
);
const advisoryRegisterPath = resolve(
  readinessRoot,
  "15_dependency_advisory_risk_register.md"
);

function readRequiredFile(path: string) {
  expect(existsSync(path), `${path} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("Story 22.3 dependency advisory readiness evidence", () => {
  it("captures the current production dependency audit output", () => {
    const evidence = readRequiredFile(auditEvidencePath);

    expect(evidence).toContain("2026-08-31");
    expect(evidence).toContain("Command: `pnpm audit --prod --json`");
    expect(evidence).toContain(
      "Fresh post-remediation audit exit code on revalidation 2026-09-01: `1`"
    );
    expect(evidence).toContain("Production advisory summary");
    expect(evidence).toContain(
      "| After Story 22.15 remediation | 0 | 0 | 1 | 0 | 1 |"
    );
    expect(evidence).toContain("GHSA-w5hq-g745-h8pq");
    expect(evidence).not.toMatch(/postgres(?:ql)?:\/\/[^\s`]+@/i);
    expect(evidence).not.toMatch(/SUPABASE_(?:SERVICE_ROLE_)?KEY\s*=/i);
  });

  it("documents residual advisories with the required risk-register fields", () => {
    const advisoryRegister = readRequiredFile(advisoryRegisterPath);

    expect(advisoryRegister).toContain("Production Advisory Risk Register");
    expect(advisoryRegister).toContain("Development Tooling");
    expect(advisoryRegister).toContain(
      "| Package | Severity | Affected path | Reason not fixed | Owner | Review date | Compensating control | Status |"
    );
    expect(advisoryRegister).toContain("dependency-audit-2026-08-31.md");
    expect(advisoryRegister).toContain("GHSA-w5hq-g745-h8pq");
    expect(advisoryRegister).toContain("2026-09-30");
    expect(advisoryRegister).toContain("Nodemailer `9.1.0`");
  });

  it("links the blocker tracker and evidence index to the advisory register", () => {
    const blockerTracker = readRequiredFile(
      resolve(readinessRoot, "11_risk_register_and_open_questions.md")
    );
    const evidenceIndex = readRequiredFile(resolve(readinessRoot, "14_evidence_index.md"));
    const commercialIndex = readRequiredFile(resolve(readinessRoot, "00_index.md"));

    for (const content of [blockerTracker, evidenceIndex, commercialIndex]) {
      expect(content).toContain("15_dependency_advisory_risk_register.md");
    }

    expect(evidenceIndex).toContain("dependency-audit-2026-08-31.md");
  });
});
