#!/usr/bin/env node
/**
 * Supabase backup storage: upload, prune (keep 14 days), download oldest.
 * Uses SUPABASE_BACKUP_STORAGE_URL and SUPABASE_SERVICE_ROLE_KEY (production project).
 * Bucket: db-backups. Paths: backup/YYYY-MM-DD/schema.sql, data.sql, roles.sql.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const BUCKET = "db-backups";
const RETENTION_DAYS = 14;
const OUT_DIR = process.env.BACKUP_OUTPUT_DIR || join(process.cwd(), "backup-output");
const RESTORE_DIR = join(OUT_DIR, "restore");

function getClient() {
  const url = process.env.SUPABASE_BACKUP_STORAGE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_BACKUP_STORAGE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, key);
}

function dateFromPrefix(prefix) {
  const m = prefix.match(/backup\/(\d{4}-\d{2}-\d{2})\/$/);
  return m ? m[1] : null;
}

async function upload(date) {
  const supabase = getClient();
  const files = ["schema.sql", "data.sql", "roles.sql"];
  for (const name of files) {
    const path = join(OUT_DIR, name);
    if (!existsSync(path)) {
      console.warn(`Skip ${name} (not found)`);
      continue;
    }
    const body = readFileSync(path);
    const objectPath = `backup/${date}/${name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
      contentType: "application/sql",
      upsert: true,
    });
    if (error) throw new Error(`Upload ${objectPath}: ${error.message}`);
    console.log(`Uploaded ${objectPath}`);
  }
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
    const { data: files } = await supabase.storage.from(BUCKET).list(`backup/${date}`);
    const names = (files || []).map((f) => f.name).filter(Boolean);
    for (const name of names) {
      const { error } = await supabase.storage.from(BUCKET).remove([`backup/${date}/${name}`]);
      if (error) console.warn(`Delete backup/${date}/${name}: ${error.message}`);
      else console.log(`Deleted backup/${date}/${name}`);
    }
  }
  if (toRemove.length === 0) console.log("No backups older than 14 days to prune.");
}

async function downloadOldest() {
  const supabase = getClient();
  const { data: list, error: listErr } = await supabase.storage.from(BUCKET).list("backup", { limit: 200 });
  if (listErr) throw new Error(`List: ${listErr.message}`);
  const dates = (list || []).filter((item) => item.name && /^\d{4}-\d{2}-\d{2}$/.test(item.name)).map((item) => item.name).sort();
  if (dates.length === 0) {
    console.log("No backups found; skipping restore.");
    process.exit(0);
  }
  const oldest = dates[0];
  console.log(`Downloading oldest backup: ${oldest}`);
  if (!existsSync(RESTORE_DIR)) mkdirSync(RESTORE_DIR, { recursive: true });
  for (const name of ["schema.sql", "data.sql", "roles.sql"]) {
    const { data, error } = await supabase.storage.from(BUCKET).download(`backup/${oldest}/${name}`);
    if (error) throw new Error(`Download backup/${oldest}/${name}: ${error.message}`);
    const buf = Buffer.from(await data.arrayBuffer());
    writeFileSync(join(RESTORE_DIR, name), buf);
    console.log(`Downloaded ${name}`);
  }
  console.log(`Oldest backup date: ${oldest}`);
}

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
