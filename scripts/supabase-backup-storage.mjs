/**
 * Supabase backup storage: upload, prune (keep 14 days), download oldest.
 * Uses SUPABASE_BACKUP_STORAGE_URL and SUPABASE_SERVICE_ROLE_KEY (production project).
 * Bucket: db-backups. Paths include the full SQL dumps and the required v2
 * employees/column_config custom archive used for atomic staging refreshes.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

import {
  BACKUP_MANIFEST,
  buildBackupManifest,
  OPTIONAL_BACKUP_FILES,
  PARTIAL_RESTORE_ARCHIVE,
  REQUIRED_BACKUP_FILES,
  selectOldestCompatibleBackup,
  validateBackupIdentity,
  verifyBackupFile,
} from "../.github/backup/backup-selection.mjs";

const BUCKET = "db-backups";
const RETENTION_DAYS = 14;
const OUT_DIR = process.env.BACKUP_OUTPUT_DIR || join(process.cwd(), "backup-output");

function getClient() {
  const url = process.env.SUPABASE_BACKUP_STORAGE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_BACKUP_STORAGE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, key);
}

export async function upload(date, options = {}) {
  const supabase = options.supabase ?? getClient();
  const outDir = options.outDir ?? OUT_DIR;
  const runId = options.runId ?? [
      process.env.GITHUB_RUN_ID || randomUUID(),
      process.env.GITHUB_RUN_ATTEMPT || "1",
    ].join("-");
  // Validate path components before the first object is uploaded so malformed
  // CI metadata cannot create objects outside the immutable run prefix.
  validateBackupIdentity({ date, runId });
  const files = [
    { name: "schema.sql", contentType: "application/sql", required: true },
    { name: "data.sql", contentType: "application/sql", required: true },
    { name: "roles.sql", contentType: "application/sql", required: false },
    {
      name: PARTIAL_RESTORE_ARCHIVE,
      contentType: "application/octet-stream",
      required: true,
    },
  ];
  for (const { name, required } of files) {
    if (!required) continue;
    const path = join(outDir, name);
    if (!existsSync(path)) {
      throw new Error(`Required backup artifact missing: ${name}`);
    }
    if (statSync(path).size === 0) {
      throw new Error(`Required backup artifact is empty: ${name}`);
    }
  }
  const uploadedFiles = [];
  for (const { name, contentType, required } of files) {
    const path = join(outDir, name);
    if (!existsSync(path)) {
      if (required) throw new Error(`Required backup artifact missing: ${name}`);
      console.warn(`Skip ${name} (not found)`);
      continue;
    }
    const body = readFileSync(path);
    if (body.length === 0) {
      if (required) throw new Error(`Required backup artifact is empty: ${name}`);
      console.warn(`Skip ${name} (empty)`);
      continue;
    }
    const objectPath = `backup/${date}/runs/${runId}/${name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
      contentType,
      upsert: false,
    });
    if (error) throw new Error(`Upload ${objectPath}: ${error.message}`);
    uploadedFiles.push({
      name,
      size: body.length,
      sha256: createHash("sha256").update(body).digest("hex"),
    });
    console.log(`Uploaded ${objectPath}`);
  }

  const manifest = buildBackupManifest({ date, runId, files: uploadedFiles });
  const manifestPath = `backup/${date}/${BACKUP_MANIFEST}`;
  const { error: manifestError } = await supabase.storage
    .from(BUCKET)
    .upload(manifestPath, JSON.stringify(manifest), {
      contentType: "application/json",
      upsert: true,
    });
  if (manifestError) {
    throw new Error(`Upload ${manifestPath}: ${manifestError.message}`);
  }
  console.log(`Published ${manifestPath} for immutable run ${runId}`);
}

async function prune() {
  const supabase = getClient();
  const { data: list, error: listErr } = await supabase.storage.from(BUCKET).list("backup", { limit: 200 });
  if (listErr) throw new Error(`List: ${listErr.message}`);
  const dates = (list || []).filter((item) => item.name && /^\d{4}-\d{2}-\d{2}$/.test(item.name)).map((item) => item.name);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const toRemove = dates.filter((d) => d < cutoffStr);
  for (const date of toRemove) {
    const { data: rootEntries, error: rootError } = await supabase.storage
      .from(BUCKET)
      .list(`backup/${date}`);
    if (rootError) throw new Error(`List backup/${date}: ${rootError.message}`);

    const rootFiles = (rootEntries || [])
      .map((entry) => entry.name)
      .filter((name) => name && name !== "runs")
      .map((name) => `backup/${date}/${name}`);
    if (rootFiles.length > 0) {
      const { error } = await supabase.storage.from(BUCKET).remove(rootFiles);
      if (error) throw new Error(`Delete backup/${date}: ${error.message}`);
    }

    const { data: runs, error: runsError } = await supabase.storage
      .from(BUCKET)
      .list(`backup/${date}/runs`);
    if (runsError) throw new Error(`List backup/${date}/runs: ${runsError.message}`);
    for (const run of runs || []) {
      if (!run.name) continue;
      const { data: runFiles, error: runFilesError } = await supabase.storage
        .from(BUCKET)
        .list(`backup/${date}/runs/${run.name}`);
      if (runFilesError) {
        throw new Error(
          `List backup/${date}/runs/${run.name}: ${runFilesError.message}`
        );
      }
      const objectPaths = (runFiles || [])
        .map((file) => file.name)
        .filter(Boolean)
        .map((name) => `backup/${date}/runs/${run.name}/${name}`);
      if (objectPaths.length > 0) {
        const { error } = await supabase.storage.from(BUCKET).remove(objectPaths);
        if (error) {
          throw new Error(
            `Delete backup/${date}/runs/${run.name}: ${error.message}`
          );
        }
      }
    }
    console.log(`Deleted backup/${date}`);
  }
  if (toRemove.length === 0) console.log("No backups older than 14 days to prune.");
}

function publishRestoreDirectory(candidateDir, restoreDir) {
  const previousDir = `${restoreDir}.previous-${randomUUID()}`;
  const hadPrevious = existsSync(restoreDir);

  if (hadPrevious) renameSync(restoreDir, previousDir);
  try {
    renameSync(candidateDir, restoreDir);
    if (hadPrevious) rmSync(previousDir, { recursive: true, force: true });
  } catch (error) {
    if (hadPrevious && existsSync(previousDir) && !existsSync(restoreDir)) {
      renameSync(previousDir, restoreDir);
    }
    throw error;
  }
}

export async function downloadOldest(options = {}) {
  const supabase = options.supabase ?? getClient();
  const outDir = options.outDir ?? OUT_DIR;
  const restoreDir = join(outDir, "restore");
  const { data: list, error: listErr } = await supabase.storage.from(BUCKET).list("backup", { limit: 200 });
  if (listErr) throw new Error(`List: ${listErr.message}`);
  const dates = (list || []).filter((item) => item.name && /^\d{4}-\d{2}-\d{2}$/.test(item.name)).map((item) => item.name).sort();
  if (dates.length === 0) {
    console.log("No backups found; skipping restore.");
    return;
  }

  const candidates = [];
  for (const date of dates) {
    const { data: manifestData, error: manifestError } = await supabase.storage
      .from(BUCKET)
      .download(`backup/${date}/${BACKUP_MANIFEST}`);
    let manifest = null;
    if (!manifestError) {
      try {
        manifest = JSON.parse(await manifestData.text());
      } catch {
        manifest = null;
      }
    }
    candidates.push({
      date,
      manifest,
    });
  }

  const remainingCandidates = [...candidates];
  while (remainingCandidates.length > 0) {
    const selected = selectOldestCompatibleBackup(remainingCandidates);
    if (!selected) break;

    const { date: oldest, manifest } = selected;
    const selectedFiles = Object.keys(manifest.files);
    const filesToDownload = [
      ...REQUIRED_BACKUP_FILES,
      ...OPTIONAL_BACKUP_FILES.filter((name) => selectedFiles.includes(name)),
    ];

    const candidateDir = join(
      outDir,
      `.restore-candidate-${manifest.runId}-${randomUUID()}`
    );
    mkdirSync(candidateDir, { recursive: true });
    try {
      for (const name of filesToDownload) {
        const objectPath = `backup/${oldest}/runs/${manifest.runId}/${name}`;
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .download(objectPath);
        if (error) {
          if (OPTIONAL_BACKUP_FILES.includes(name)) {
            console.warn(`Skip optional ${objectPath}: ${error.message}`);
            continue;
          }
          throw new Error(`Download ${objectPath}: ${error.message}`);
        }
        const buf = Buffer.from(await data.arrayBuffer());
        try {
          verifyBackupFile(manifest, name, buf);
        } catch (error) {
          if (OPTIONAL_BACKUP_FILES.includes(name)) {
            console.warn(
              `Skip corrupt optional ${objectPath}:`,
              error instanceof Error ? error.message : error
            );
            continue;
          }
          throw error;
        }
        // Persist one verified file at a time so large dumps are not retained
        // together in memory. The candidate stays private until all required
        // files pass verification.
        writeFileSync(join(candidateDir, name), buf);
        console.log(`Downloaded and verified ${name}`);
      }
      publishRestoreDirectory(candidateDir, restoreDir);
      console.log(`Oldest valid backup date: ${oldest}`);
      return;
    } catch (error) {
      rmSync(candidateDir, { recursive: true, force: true });
      console.warn(
        `Skipping invalid backup ${oldest} run ${manifest.runId}:`,
        error instanceof Error ? error.message : error
      );
      const index = remainingCandidates.indexOf(selected);
      remainingCandidates.splice(index, 1);
    }
  }

  throw new Error(
    `No valid completed backup contains required ${PARTIAL_RESTORE_ARCHIVE}; staging restore cannot proceed.`
  );
}

const isDirectExecution =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const cmd = process.argv[2];
  const arg = process.argv[3];

  if (cmd === "upload" && arg) {
    upload(arg).catch((e) => { console.error(e); process.exit(1); });
  } else if (cmd === "prune") {
    prune().catch((e) => { console.error(e); process.exit(1); });
  } else if (cmd === "download-oldest") {
    downloadOldest().catch((e) => { console.error(e); process.exit(1); });
  } else {
    console.error("Usage: supabase-backup-storage.mjs <upload YYYY-MM-DD | prune | download-oldest>");
    process.exit(1);
  }
}
