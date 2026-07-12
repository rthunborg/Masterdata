import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { Blob } from "node:buffer";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const workflowPath = resolve(
  process.cwd(),
  ".github/workflows/supabase-nightly-backup.yml"
);
const syncSqlPath = resolve(
  process.cwd(),
  ".github/backup/sync-runtime-employee-columns.sql"
);
const selectorPath = resolve(
  process.cwd(),
  ".github/backup/backup-selection.mjs"
);
const storageScriptPath = resolve(
  process.cwd(),
  "scripts/supabase-backup-storage.mjs"
);

describe("Story 22.13 nightly runtime-column restore", () => {
  it("creates a required custom archive for employees and column_config", () => {
    const workflow = readFileSync(workflowPath, "utf8");
    const partialDumpStep = workflow.match(
      /- name: Dump employees and column_config[\s\S]*?(?=\n\s{6}- name:)/
    )?.[0];

    expect(partialDumpStep).toBeDefined();
    expect(partialDumpStep).toMatch(/pg_dump[\s\S]*--format=custom/);
    expect(partialDumpStep).toContain("employees-column_config.dump");
    expect(partialDumpStep).toMatch(
      /pg_dump[\s\S]*?pg_restore\s+--list[\s\S]*?employees-column_config\.dump/
    );
    expect(partialDumpStep).not.toContain("continue-on-error");
  });

  it("replays config, syncs missing columns, and replays employees atomically", () => {
    const workflow = readFileSync(workflowPath, "utf8");
    const restoreStep = workflow.match(
      /- name: Restore employees and column_config[\s\S]*?(?=\n\s{6}- name:|\n\s{4}#)/
    )?.[0];

    expect(restoreStep).toBeDefined();
    expect(restoreStep).toMatch(
      /if\s+\[\s*!\s+-f\s+"\$ARCHIVE"\s*\][\s\S]*?exit\s+1/
    );
    expect(restoreStep).toContain("--single-transaction");
    expect(restoreStep).toMatch(
      /pg_restore[\s\S]*--strict-names[\s\S]*--schema=public[\s\S]*--table=column_config/
    );
    expect(restoreStep).toMatch(
      /pg_restore[\s\S]*--strict-names[\s\S]*--schema=public[\s\S]*--table=employees/
    );
    expect(restoreStep).not.toMatch(/--table=public\./);
    expect(restoreStep).toMatch(
      /TRUNCATE[\s\S]*COLUMN_CONFIG_SQL[\s\S]*sync-runtime-employee-columns\.sql[\s\S]*EMPLOYEES_SQL/
    );
  });

  it("checks in an injection-safe fixed-type missing-column synchronizer", () => {
    expect(existsSync(syncSqlPath)).toBe(true);
    if (!existsSync(syncSqlPath)) return;

    const sql = readFileSync(syncSqlPath, "utf8");
    expect(sql).toMatch(/from\s+public\.column_config/i);
    expect(sql).toMatch(/\^\[a-z\]\[a-z0-9_\]\*\$/i);
    expect(sql).toMatch(/octet_length\s*\([^)]*\)\s*>\s*63/i);
    expect(sql).toMatch(/when\s+'text'\s+then\s+'text'/i);
    expect(sql).toMatch(/when\s+'number'\s+then\s+'numeric\(20,2\)'/i);
    expect(sql).toMatch(/when\s+'date'\s+then\s+'date'/i);
    expect(sql).toMatch(/when\s+'boolean'\s+then\s+'boolean'/i);
    expect(sql).toMatch(/format\s*\([^;]*%I/is);
    expect(sql).toMatch(/create\s+index\s+if\s+not\s+exists/i);
    expect(sql).not.toMatch(/where[^;]*is_masterdata\s*=\s*false/is);
  });

  it("rejects identical production and staging database targets before restore", () => {
    const workflow = readFileSync(workflowPath, "utf8");
    const restoreStep = workflow.match(
      /- name: Restore employees and column_config[\s\S]*?(?=\n\s{6}- name:|\n\s{4}#)/
    )?.[0];

    expect(restoreStep).toMatch(
      /SUPABASE_DB_URL["'}\s]*\s*=\s*["'{\s]*\$?STAGING_SUPABASE_DB_URL[\s\S]*?exit\s+1/
    );
    expect(restoreStep?.indexOf("SUPABASE_DB_URL")).toBeLessThan(
      restoreStep?.indexOf('psql "$STAGING_SUPABASE_DB_URL"') ?? -1
    );
  });

  it("selects the oldest backup with the v2 partial archive", async () => {
    expect(existsSync(selectorPath)).toBe(true);
    if (!existsSync(selectorPath)) return;

    const backupSelectionModule = (await import(pathToFileURL(selectorPath).href)) as {
      buildBackupManifest: (input: {
        date: string;
        runId: string;
        files: Array<{ name: string; size: number; sha256: string }>;
      }) => unknown;
      selectOldestCompatibleBackup: (
        candidates: Array<{ date: string; manifest: unknown }>
      ) => { date: string; manifest: unknown } | null;
    };

    const completeManifest = backupSelectionModule.buildBackupManifest({
      date: "2026-07-07",
      runId: "run-100-1",
      files: [
        { name: "schema.sql", size: 10, sha256: "a".repeat(64) },
        { name: "data.sql", size: 20, sha256: "b".repeat(64) },
        {
          name: "employees-column_config.dump",
          size: 30,
          sha256: "c".repeat(64),
        },
      ],
    });

    expect(
      backupSelectionModule.selectOldestCompatibleBackup([
        {
          date: "2026-07-01",
          manifest: null,
        },
        {
          date: "2026-07-07",
          manifest: completeManifest,
        },
        {
          date: "2026-07-09",
          manifest: backupSelectionModule.buildBackupManifest({
            date: "2026-07-09",
            runId: "run-101-1",
            files: [
              { name: "schema.sql", size: 10, sha256: "d".repeat(64) },
              { name: "data.sql", size: 20, sha256: "e".repeat(64) },
              {
                name: "employees-column_config.dump",
                size: 30,
                sha256: "f".repeat(64),
              },
            ],
          }),
        },
      ])
    ).toMatchObject({ date: "2026-07-07", manifest: completeManifest });

    expect(
      backupSelectionModule.selectOldestCompatibleBackup([
        {
          date: "2026-07-01",
          manifest: null,
        },
      ])
    ).toBeNull();
  });

  it("publishes immutable run objects before replacing the date manifest", () => {
    const script = readFileSync(storageScriptPath, "utf8");

    expect(script).toContain("BACKUP_MANIFEST");
    expect(script).toContain("runs/${runId}/${name}");
    expect(script).toMatch(/upsert:\s*false/);
    expect(script).toMatch(
      /for\s*\([^)]*files[^)]*\)[\s\S]*?runs\/\$\{runId\}[\s\S]*?upload[\s\S]*?BACKUP_MANIFEST[\s\S]*?upsert:\s*true/
    );
  });

  it("rejects downloaded backup content that does not match its manifest", async () => {
    const backupSelectionModule = (await import(pathToFileURL(selectorPath).href)) as {
      buildBackupManifest: (input: {
        date: string;
        runId: string;
        files: Array<{ name: string; size: number; sha256: string }>;
      }) => unknown;
      verifyBackupFile: (
        manifest: unknown,
        name: string,
        body: Uint8Array
      ) => void;
    };
    const body = Buffer.from("valid archive content");
    const manifest = backupSelectionModule.buildBackupManifest({
      date: "2026-07-10",
      runId: "run-200-1",
      files: [
        {
          name: "employees-column_config.dump",
          size: body.length,
          sha256: createHash("sha256").update(body).digest("hex"),
        },
      ],
    });

    expect(() =>
      backupSelectionModule.verifyBackupFile(
        manifest,
        "employees-column_config.dump",
        body
      )
    ).not.toThrow();
    expect(() =>
      backupSelectionModule.verifyBackupFile(
        manifest,
        "employees-column_config.dump",
        Buffer.from("truncated")
      )
    ).toThrow(/integrity check failed/i);

    const script = readFileSync(storageScriptPath, "utf8");
    expect(script).toMatch(
      /verifyBackupFile[\s\S]*?writeFileSync\(join\(candidateDir, name\)/
    );
  });

  it("rejects empty backup artifacts and validates identity before upload", async () => {
    const backupSelectionModule = (await import(pathToFileURL(selectorPath).href)) as {
      buildBackupManifest: (input: {
        date: string;
        runId: string;
        files: Array<{ name: string; size: number; sha256: string }>;
      }) => unknown;
    };
    expect(() =>
      backupSelectionModule.buildBackupManifest({
        date: "2026-07-12",
        runId: "run-1",
        files: [
          { name: "schema.sql", size: 0, sha256: "a".repeat(64) },
        ],
      })
    ).toThrow(/metadata|empty/i);

    const storageModule = (await import(pathToFileURL(storageScriptPath).href)) as {
      upload: (
        date: string,
        options: { supabase: unknown; outDir: string; runId: string }
      ) => Promise<void>;
    };
    const from = () => ({ upload: () => Promise.resolve({ error: null }) });
    await expect(
      storageModule.upload("../../escape", {
        supabase: { storage: { from } },
        outDir: process.cwd(),
        runId: "../../escape",
      })
    ).rejects.toThrow(/invalid backup/i);
  });

  it("falls back from a corrupt oldest run and ignores corrupt optional roles", async () => {
    const outputDir = mkdtempSync(resolve(tmpdir(), "story-22-13-backup-"));
    try {
      const selector = (await import(pathToFileURL(selectorPath).href)) as {
        buildBackupManifest: (input: {
          date: string;
          runId: string;
          files: Array<{ name: string; size: number; sha256: string }>;
        }) => unknown;
      };
      const storageModule = (await import(pathToFileURL(storageScriptPath).href)) as {
        downloadOldest: (options: {
          supabase: unknown;
          outDir: string;
        }) => Promise<void>;
      };
      const files = {
        "schema.sql": Buffer.from("schema"),
        "data.sql": Buffer.from("data"),
        "employees-column_config.dump": Buffer.from("archive"),
        "roles.sql": Buffer.from("roles"),
      };
      const manifestFor = (date: string, runId: string) =>
        selector.buildBackupManifest({
          date,
          runId,
          files: Object.entries(files).map(([name, body]) => ({
            name,
            size: body.length,
            sha256: createHash("sha256").update(body).digest("hex"),
          })),
        });
      const manifests = {
        "2026-07-01": manifestFor("2026-07-01", "old-run"),
        "2026-07-02": manifestFor("2026-07-02", "valid-run"),
      };

      const download = async (path: string) => {
        const manifestMatch = path.match(/^backup\/(\d{4}-\d{2}-\d{2})\/manifest\.json$/);
        if (manifestMatch) {
          return {
            data: new Blob([JSON.stringify(manifests[manifestMatch[1] as keyof typeof manifests])]),
            error: null,
          };
        }
        if (path.includes("old-run/schema.sql")) {
          return { data: new Blob(["corrupt"]), error: null };
        }
        if (path.includes("valid-run/roles.sql")) {
          return { data: null, error: { message: "optional object unavailable" } };
        }
        const name = path.split("/").at(-1) as keyof typeof files;
        return { data: new Blob([files[name]]), error: null };
      };
      const bucket = {
        list: async (path: string) =>
          path === "backup"
            ? { data: [{ name: "2026-07-01" }, { name: "2026-07-02" }], error: null }
            : { data: [], error: null },
        download,
      };
      const supabase = { storage: { from: () => bucket } };

      await storageModule.downloadOldest({ supabase, outDir: outputDir });

      for (const [name, body] of Object.entries(files).filter(([name]) => name !== "roles.sql")) {
        expect(readFileSync(resolve(outputDir, "restore", name))).toEqual(body);
      }
      expect(existsSync(resolve(outputDir, "restore", "roles.sql"))).toBe(false);

      const script = readFileSync(storageScriptPath, "utf8");
      expect(script).not.toMatch(/verifiedFiles\s*=\s*new\s+Map/);
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("keeps the roles dump best-effort without weakening restore compatibility", () => {
    const script = readFileSync(storageScriptPath, "utf8");

    expect(script).toMatch(
      /name:\s*["']roles\.sql["'][\s\S]*?required:\s*false/
    );
    expect(script).toContain("OPTIONAL_BACKUP_FILES");
    expect(script).toMatch(
      /if\s*\(\s*!selected\s*\)[\s\S]*?throw\s+new\s+Error/
    );
  });
});
