import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const readinessRoot = resolve(repoRoot, "docs/commercial-readiness");
const auditEvidencePath = resolve(
  readinessRoot,
  "evidence/dependency-audit-2026-06-05.md"
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

    expect(evidence).toContain("Generated: 2026-06-05");
    expect(evidence).toContain("Command: `pnpm audit --prod`");
    expect(evidence).toMatch(/Exit code: `[01]`/);
    expect(evidence).toContain("Production advisory summary");
    expect(evidence).toContain(
      "| After Story 22.3 remediation | 0 | 0 | 2 | 1 | 3 |"
    );
    expect(evidence).toContain("Full audit output");
    expect(evidence).not.toMatch(/\b(?:critical|high) -/i);
    expect(evidence).not.toMatch(/postgres(?:ql)?:\/\/[^\s`]+@/i);
    expect(evidence).not.toMatch(/SUPABASE_(?:SERVICE_ROLE_)?KEY\s*=/i);
  });

  it("documents residual advisories with the required risk-register fields", () => {
    const advisoryRegister = readRequiredFile(advisoryRegisterPath);

    expect(advisoryRegister).toContain("Production Advisory Risk Register");
    expect(advisoryRegister).toContain("Dev-Only Advisory Register");
    expect(advisoryRegister).toContain(
      "| Package | Severity | Affected path | Reason not fixed | Owner | Target date | Compensating control | Status |"
    );
    expect(advisoryRegister).toContain("docs/commercial-readiness/evidence/dependency-audit-2026-06-05.md");

    for (const advisoryId of [
      "GHSA-vvjj-xcjg-gr5g",
      "GHSA-c7w3-x93f-qmm8",
      "GHSA-w5hq-g745-h8pq",
    ]) {
      expect(advisoryRegister).toContain(advisoryId);
    }

    for (const devOnlyAdvisoryId of [
      "GHSA-5xrq-8626-4rwp",
      "GHSA-v2wj-q39q-566r",
      "GHSA-p9ff-h696-f583",
      "GHSA-4w7w-66w2-5vf9",
      "GHSA-mw96-cpmx-2vgc",
      "GHSA-3ppc-4f35-3m26",
      "GHSA-7r86-cg39-jmmj",
      "GHSA-23c5-xmqv-rm74",
      "GHSA-c2c7-rcm5-vvqj",
      "GHSA-3v7f-55p6-f55p",
      "GHSA-25h7-pfq9-p65f",
      "GHSA-rf6f-7fwh-wjgh",
      "GHSA-2g4f-4pwh-qvx6",
    ]) {
      expect(advisoryRegister).toContain(devOnlyAdvisoryId);
    }
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

    expect(evidenceIndex).toContain("dependency-audit-2026-06-05.md");
  });
});
