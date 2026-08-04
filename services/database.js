/**
 * Database — SQLite with persistent storage + scheduler columns
 * The Ranking Store API
 *
 * Scheduler columns added to leads table:
 *   next_email_at        — ISO timestamp of next scheduled email
 *   next_email_step      — Step number (1=scan, 2=proposal, 3-8=followups)
 *   sequence_status      — idle | active | paused | completed | failed
 *   last_email_sent_at   — ISO timestamp of most recent email
 *   proposal_sent_at     — ISO timestamp when proposal was sent
 *   stopped_at           — ISO timestamp when sequence was stopped
 *   stop_reason          — Why sequence stopped
 *
 * Persistent storage: Render paid plan — /var/data
 * Local dev: configurable via DATABASE_PATH
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/leads.db';
const REPORT_PATH = process.env.REPORT_STORAGE_PATH || './data/reports';

let db = null;

export function initDatabase() {
  const dbDir = path.dirname(DB_PATH);
  const reportDir = REPORT_PATH;

  for (const dir of [dbDir, reportDir]) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[DB] Created directory: ${dir}`);
      } catch (err) {
        console.error(`[DB] FATAL: Cannot create ${dir}: ${err.message}`);
        process.exit(1);
      }
    }
    try {
      fs.accessSync(dir, fs.constants.W_OK);
    } catch {
      console.error(`[DB] FATAL: Not writable: ${dir}`);
      process.exit(1);
    }
  }

  try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    console.log(`[DB] Initialized at: ${DB_PATH}`);
  } catch (err) {
    console.error(`[DB] FATAL: Cannot open database: ${err.message}`);
    process.exit(1);
  }

  initSchema();
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      business TEXT NOT NULL,
      website TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      main_service TEXT DEFAULT '',
      gbp_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',

      scan_status TEXT DEFAULT 'New',
      scan_date TEXT,
      scan_score INTEGER,
      scan_report_html TEXT,
      scan_report_pdf TEXT,
      scan_report_url TEXT,

      scan_email_sent INTEGER DEFAULT 0,
      scan_email_date TEXT,
      scan_email_status TEXT,

      proposal_email_sent INTEGER DEFAULT 0,
      proposal_email_date TEXT,
      proposal_email_status TEXT,
      proposal_package TEXT,
      proposal_price TEXT,
      proposal_buy_url TEXT,
      proposal_call_url TEXT,

      status TEXT DEFAULT 'New',
      stop_reason TEXT,
      stopped_at TEXT,
      reply_count INTEGER DEFAULT 0,
      last_reply_at TEXT,

      follow_ups TEXT DEFAULT '[]',
      signals TEXT,
      scores TEXT,
      errors TEXT DEFAULT '[]',

      -- Scheduler columns
      next_email_at TEXT,
      next_email_step INTEGER DEFAULT 0,
      sequence_status TEXT DEFAULT 'idle',
      last_email_sent_at TEXT,
      proposal_sent_at TEXT,

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      source TEXT DEFAULT 'TheRankingStore.io',
      referral_partner TEXT DEFAULT 'Rick Fleming'
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT NOT NULL,
      email_type TEXT NOT NULL,
      step INTEGER,
      subject TEXT,
      sent_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'sent',
      error TEXT,
      attempt INTEGER DEFAULT 1,
      idempotency_key TEXT UNIQUE,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE INDEX IF NOT EXISTS idx_email_log_lead ON email_log(lead_id);
    CREATE INDEX IF NOT EXISTS idx_leads_next_email ON leads(next_email_at);
    CREATE INDEX IF NOT EXISTS idx_leads_sequence ON leads(sequence_status);
  `);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name).sort();
  console.log(`[DB] Tables: ${tableNames.join(', ')}`);
}

export function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function getReportStoragePath() {
  return REPORT_PATH;
}