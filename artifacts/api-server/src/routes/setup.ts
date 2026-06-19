import { Router } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger";

const router = Router();

function getProjectRef(): string {
  const url = process.env["SUPABASE_URL"] ?? "";
  return url.replace("https://", "").replace(".supabase.co", "").split(".")[0];
}

function getSetupSql(): string {
  // Try multiple candidate paths — works both in dev (cwd = artifacts/api-server)
  // and when started from workspace root.
  const candidates = [
    join(process.cwd(), "db", "nazafa_complete_setup.sql"),           // root-relative start
    join(process.cwd(), "..", "..", "db", "nazafa_complete_setup.sql"), // artifacts/api-server → root
    join(import.meta.dirname, "..", "..", "..", "db", "nazafa_complete_setup.sql"), // relative to src/routes
  ];
  for (const p of candidates) {
    try {
      return readFileSync(p, "utf-8");
    } catch { /* try next */ }
  }
  return "";
}

router.get("/admin/db-setup/sql", (_req, res) => {
  const sql = getSetupSql();
  if (!sql) return res.status(404).json({ error: "SQL file not found" });
  res.json({ sql, projectRef: getProjectRef(), length: sql.length });
});

router.post("/admin/db-setup", async (req, res) => {
  const { managementKey } = req.body as { managementKey?: string };
  const projectRef = getProjectRef();

  if (!managementKey) {
    return res.status(400).json({ error: "managementKey required. Get one from https://app.supabase.com/account/tokens" });
  }
  if (!projectRef) {
    return res.status(400).json({ error: "SUPABASE_URL env var not set" });
  }

  const sql = getSetupSql();
  if (!sql) {
    return res.status(500).json({ error: "Setup SQL file not found at db/nazafa_complete_setup.sql" });
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${managementKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      logger.error({ status: response.status, body: responseText }, "db-setup failed");
      return res.status(400).json({
        error: "Supabase API error",
        details: responseText,
        hint: "Make sure the Management API key is correct and has the right permissions",
      });
    }

    let result: unknown;
    try { result = JSON.parse(responseText); } catch { result = responseText; }

    logger.info({ projectRef }, "db-setup completed successfully");
    return res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, "db-setup network error");
    return res.status(500).json({ error: "Network error contacting Supabase API" });
  }
});

export default router;
