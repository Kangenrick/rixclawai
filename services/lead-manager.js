/**
 * Lead Manager — create, read, update, list leads with SQLite
 * The Ranking Store API
 */
import { getDb } from './database.js';
import { v4 as uuidv4 } from 'uuid';

export class LeadManager {
  create(data) {
    const id = 'LF-' + uuidv4().slice(0, 8).toUpperCase();
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO leads (id, name, business, website, email, phone, industry, city, state, main_service, gbp_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, data.name, data.business, data.website, data.email, data.phone || '',
      data.industry || '', data.city || '', data.state || '', data.mainService || '',
      data.gbpUrl || '', data.notes || '');
    return this.get(id);
  }

  get(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    if (!row) return null;
    row.followUps = JSON.parse(row.follow_ups || '[]');
    row.signals = row.signals ? JSON.parse(row.signals) : null;
    row.scores = row.scores ? JSON.parse(row.scores) : null;
    row.errors = JSON.parse(row.errors || '[]');
    row.scanEmailSent = !!row.scan_email_sent;
    row.proposalEmailSent = !!row.proposal_email_sent;
    return row;
  }

  list(status) {
    const db = getDb();
    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC').all(status);
    } else {
      rows = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    }
    return rows.map(r => ({
      ...r,
      followUps: JSON.parse(r.follow_ups || '[]'),
      scanEmailSent: !!r.scan_email_sent,
      proposalEmailSent: !!r.proposal_email_sent,
    }));
  }

  update(id, updates) {
    const db = getDb();
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${col} = ?`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.get(id);
  }

  logEmail(leadId, emailType, subject, status, error) {
    const db = getDb();
    db.prepare('INSERT INTO email_log (lead_id, email_type, subject, status, error) VALUES (?, ?, ?, ?, ?)')
      .run(leadId, emailType, subject, status, error || null);
  }

  shouldStop(id) {
    const lead = this.get(id);
    if (!lead) return true;
    return ['purchased', 'replied', 'unsubscribed', 'bounced', 'stopped', 'closed'].includes(lead.status);
  }

  stop(id, reason) {
    return this.update(id, { status: reason, stop_reason: reason, stopped_at: new Date().toISOString() });
  }

  recordReply(id) {
    const lead = this.get(id);
    if (!lead) return null;
    return this.update(id, {
      status: 'replied',
      reply_count: (lead.reply_count || 0) + 1,
      last_reply_at: new Date().toISOString(),
    });
  }
}

export const leadManager = new LeadManager();