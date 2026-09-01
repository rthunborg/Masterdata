import { createHash } from "node:crypto";

export const PARTIAL_RESTORE_ARCHIVE = "employees-column_config.dump";
export const BACKUP_MANIFEST = "manifest.json";
export const BACKUP_MANIFEST_VERSION = 1;

export const REQUIRED_BACKUP_FILES = Object.freeze([
  "schema.sql",
  "data.sql",
  PARTIAL_RESTORE_ARCHIVE,
]);

export const OPTIONAL_BACKUP_FILES = Object.freeze(["roles.sql"]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RUN_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function validateBackupIdentity({ date, runId }) {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (
    !DATE_PATTERN.test(date ?? "") ||
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Invalid backup date");
  }
  if (
    !RUN_ID_PATTERN.test(runId ?? "") ||
    runId === "." ||
    runId === ".." ||
    runId.length > 128
  ) {
    throw new Error("Invalid backup run id");
  }
}

export function buildBackupManifest({ date, runId, files }) {
  validateBackupIdentity({ date, runId });

  const fileEntries = {};
  for (const file of files) {
    if (
      typeof file?.name !== "string" ||
      !Number.isInteger(file.size) ||
      file.size <= 0 ||
      !SHA256_PATTERN.test(file.sha256)
    ) {
      throw new Error("Invalid backup file metadata");
    }
    if (fileEntries[file.name]) {
      throw new Error(`Duplicate backup file metadata: ${file.name}`);
    }
    fileEntries[file.name] = { size: file.size, sha256: file.sha256 };
  }

  return {
    version: BACKUP_MANIFEST_VERSION,
    date,
    runId,
    files: fileEntries,
  };
}

export function isCompatibleBackupManifest(manifest, expectedDate) {
  if (
    !manifest ||
    manifest.version !== BACKUP_MANIFEST_VERSION ||
    manifest.date !== expectedDate ||
    !RUN_ID_PATTERN.test(manifest.runId ?? "") ||
    !manifest.files ||
    typeof manifest.files !== "object"
  ) {
    return false;
  }

  return REQUIRED_BACKUP_FILES.every((name) => {
    const file = manifest.files[name];
    return (
      file &&
      Number.isInteger(file.size) &&
      file.size > 0 &&
      SHA256_PATTERN.test(file.sha256 ?? "")
    );
  });
}

export function verifyBackupFile(manifest, name, body) {
  const expected = manifest?.files?.[name];
  const actualSize = body?.byteLength;
  const actualSha256 = createHash("sha256").update(body).digest("hex");
  if (
    !expected ||
    expected.size !== actualSize ||
    expected.sha256 !== actualSha256
  ) {
    throw new Error(`Backup integrity check failed for ${name}`);
  }
}

export function selectOldestCompatibleBackup(candidates) {
  const compatible = candidates
    .filter(
      (candidate) =>
        DATE_PATTERN.test(candidate.date) &&
        isCompatibleBackupManifest(candidate.manifest, candidate.date)
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  return compatible[0] ?? null;
}
