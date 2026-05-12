#!/usr/bin/env node
/**
 * Bulk-import Orchestra Active Members into the CRM.
 * Reads the CSV, maps fields, then writes the whole array to Upstash in one shot.
 *
 * Usage:
 *   UPSTASH_REDIS_REST_URL=... \
 *   UPSTASH_REDIS_REST_TOKEN=... \
 *   CSV_PATH=/abs/path/to/export.csv \
 *   node scripts/import-orchestra.mjs
 *
 * Or load from .env.development.local via `vercel env pull` and run:
 *   node --env-file=.env.development.local scripts/import-orchestra.mjs
 */

import { readFileSync } from "fs";
import { randomUUID } from "crypto";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CSV_PATH = process.env.CSV_PATH;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error(
    "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. " +
      "Run `vercel env pull .env.development.local` then re-run with `node --env-file=.env.development.local …`."
  );
  process.exit(1);
}

if (!CSV_PATH) {
  console.error("Missing CSV_PATH env var (absolute path to the Orchestra export CSV).");
  process.exit(1);
}

const LEADS_KEY = "crm:leads";

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVRow(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(content) {
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = parseCSVRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVRow(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] ?? "").trim();
    });
    return obj;
  });
}

// ── Field helpers ─────────────────────────────────────────────────────────────

const INSTRUMENT_MAP = {
  guitar: "guitar",
  drums: "drums",
  drum: "drums",
  percussion: "drums",
  bass: "bass",
  vocals: "vocals",
  vocal: "vocals",
  voice: "vocals",
  singing: "vocals",
  piano: "keys",
  keyboard: "keys",
  keys: "keys",
  organ: "keys",
  ukulele: "ukulele",
  violin: "violin",
  viola: "violin",
  strings: "violin",
};

function normalizeInstrument(raw) {
  if (!raw) return "guitar";
  const first = raw.split(";")[0].trim().toLowerCase();
  return INSTRUMENT_MAP[first] ?? "guitar";
}

function calculateAge(birthdate) {
  if (!birthdate) return 0;
  try {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? age : 0;
  } catch {
    return 0;
  }
}

function buildNotes(row) {
  const parts = [];
  const city = row["City"];
  const state = row["State"];
  if (city || state) parts.push([city, state].filter(Boolean).join(", "));
  return parts.join(" | ");
}

// ── Redis helpers ─────────────────────────────────────────────────────────────

async function redisGet(key) {
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const data = await res.json();
  if (data.result === null || data.result === undefined) return null;
  try {
    return typeof data.result === "string" ? JSON.parse(data.result) : data.result;
  } catch {
    return data.result;
  }
}

async function redisSet(key, value) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Reading CSV…");
  const content = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(content);
  console.log(`  Parsed ${rows.length} rows from CSV`);

  console.log("Fetching existing leads from Redis…");
  const existing = (await redisGet(LEADS_KEY)) ?? [];
  console.log(`  Found ${existing.length} existing leads`);

  const existingEmails = new Set(
    existing.map((l) => l.email?.toLowerCase()).filter(Boolean)
  );

  const now = new Date().toISOString();
  const nextAction = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let imported = 0;
  let skipped = 0;
  const newLeads = [];

  for (const row of rows) {
    const name = row["Name"];
    if (!name) { skipped++; continue; }

    const email = row["Email"] ?? "";

    if (email && existingEmails.has(email.toLowerCase())) {
      skipped++;
      continue;
    }

    const age =
      parseInt(row["Age"]) > 0
        ? parseInt(row["Age"])
        : calculateAge(row["Birthdate"]);

    const tags = row["Tags"]
      ? row["Tags"].split(";").map((t) => t.trim()).filter(Boolean)
      : [];

    const lead = {
      id: randomUUID(),
      name,
      email,
      phone: row["Primary Phone"] ?? "",
      status: "active",
      phase: "activate",
      source: "opus1",
      instrument: normalizeInstrument(row["Instruments"]),
      age,
      notes: buildNotes(row),
      assignedTo: "",
      tags,
      lastContactDate: now,
      nextActionDate: nextAction,
      createdAt: now,
      updatedAt: now,
    };

    newLeads.push(lead);
    if (email) existingEmails.add(email.toLowerCase());
    imported++;
  }

  console.log(`  ${imported} to import, ${skipped} skipped (duplicates/blanks)`);

  const merged = [...existing, ...newLeads];
  console.log(`Writing ${merged.length} total leads to Redis…`);

  const result = await redisSet(LEADS_KEY, merged);
  if (result.result === "OK") {
    console.log(`✅  Done! ${imported} Active Members imported into CRM.`);
  } else {
    console.error("❌  Redis write failed:", result);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
