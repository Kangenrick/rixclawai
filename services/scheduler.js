/**
 * Email Scheduler — persistent, restart-safe follow-up sequencing
 * The Ranking Store API
 *
 * Polls SQLite every 60 seconds for leads with scheduled emails due.
 * Resumes correctly after server restart or redeploy.
 * Never sends the same step twice (uses idempotency keys).
 * Respects TEST_MODE, stop conditions, and retry limits.
 */
import { getDb } from './database.js';
import { emailService } from './email.js';
import * as EmailTemplates from './email-templates.js';
import { LeadManager } from './lead-manager.js';

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const MAX_RETRIES = 3;
const STOP_STATUSES = new Set(['purchased', 'replied', 'unsubscribed', 'bounced', 'stopped', 'closed']);

let intervalHandle = null;

/**
 * Start the scheduler. Called once at server boot.
 */
export function startScheduler() {
  console.log(`[Scheduler] Starting (poll interval: ${POLL_INTERVAL_MS}ms)`);
  // Run immediately on start, then every POLL_INTERVAL_MS
  tick();
  intervalHandle = setInterval(tick, POLL_INTERVAL_MS);
}

/**
 * Stop the scheduler (graceful shutdown).
 */
export function stopScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[Scheduler] Stopped.');
  }
}

/**
 * Single tick — query for due emails and process them.
 */
async function tick() {
  const db = getDb();
  const now = new Date().toISOString();

  // Find leads with scheduled emails due
  const due = db.prepare(`
    SELECT * FROM leads
    WHERE next_email_at IS NOT NULL
      AND next_email_at <= ?
      AND sequence_status = 'active'
      AND status NOT IN ('purchased','replied','unsubscribed','bounced','stopped','closed')
    ORDER BY next_email_at ASC
    LIMIT 20
  `).all(now);

  if (due.length === 0) return;

  for (const row of due) {
    const lead = {
      ...row,
      followUps: JSON.parse(row.follow_ups || '[]'),
      signals: row.signals ? JSON.parse(row.signals) : null,
      scores: row.scores ? JSON.parse(row.scores) : null,
      scanEmailSent: !!row.scan_email_sent,
      proposalEmailSent: !!row.proposal_email_sent,
    };

    try {
      await processDueEmail(lead, db);
    } catch (err) {
      console.error(`[Scheduler] Error processing ${lead.id} step ${lead.next_email_step}: ${err.message}`);
    }
  }
}

/**
 * Process one due email.
 */
async function processDueEmail(lead, db) {
  const step = lead.next_email_step;
  if (!step || step < 1) return;

  // Double-check stop conditions inside transaction
  const check = db.prepare('SELECT status FROM leads WHERE id = ?').get(lead.id);
  if (!check || STOP_STATUSES.has(check.status)) {
    db.prepare('UPDATE leads SET sequence_status = ?, next_email_at = NULL WHERE id = ?')
      .run('completed', lead.id);
    return;
  }

  // Check idempotency — was this step already sent?
  const ik = `${lead.id}-step-${step}`;
  const already = db.prepare('SELECT id FROM email_log WHERE idempotency_key = ?').get(ik);
  if (already) {
    // Already sent — advance past this step
    advanceStep(lead.id, db);
    return;
  }

  // Build email content based on step
  let email;
  try {
    email = buildEmailForStep(lead, step);
  } catch (err) {
    console.error(`[Scheduler] Build failed ${lead.id} step ${step}: ${err.message}`);
    return;
  }

  if (!email) {
    // No email for this step (sequence complete)
    db.prepare('UPDATE leads SET sequence_status = ?, next_email_at = NULL, next_email_step = 0 WHERE id = ?')
      .run('completed', lead.id);
    return;
  }

  // Attempt send (up to MAX_RETRIES)
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await emailService.send({ ...email, to: lead.email });
      // Log success
      db.prepare(`
        INSERT INTO email_log (lead_id, email_type, step, subject, status, attempt, idempotency_key)
        VALUES (?, ?, ?, ?, 'sent', ?, ?)
      `).run(lead.id, step === 1 ? 'scan' : step === 2 ? 'proposal' : `followup-${step}`, step, email.subject, attempt, ik);

      db.prepare(`
        UPDATE leads SET last_email_sent_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(new Date().toISOString(), lead.id);

      // Advance to next step
      advanceStep(lead.id, db);
      return; // success
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        // Brief wait before retry
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // All retries exhausted
  console.error(`[Scheduler] Failed ${lead.id} step ${step} after ${MAX_RETRIES} attempts: ${lastError.message}`);
  db.prepare(`
    INSERT INTO email_log (lead_id, email_type, step, subject, status, attempt, error, idempotency_key)
    VALUES (?, ?, ?, ?, 'failed', ?, ?, ?)
  `).run(lead.id, step === 1 ? 'scan' : step === 2 ? 'proposal' : `followup-${step}`, step,
    lastError.message, MAX_RETRIES, lastError.message, ik);

  // Mark for manual review
  db.prepare(`
    UPDATE leads SET status = 'Needs Manual Review', sequence_status = 'failed', updated_at = datetime('now')
    WHERE id = ?
  `).run(lead.id);
}

/**
 * Advance to the next step in the sequence.
 * Steps: 1=scan, 2=proposal, 3-8=follow-ups
 */
function advanceStep(leadId, db) {
  const lead = db.prepare('SELECT next_email_step, next_email_at, proposal_sent_at FROM leads WHERE id = ?').get(leadId);
  if (!lead) return;

  const current = lead.next_email_step || 1;
  const dayOffsets = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 6, 6: 8, 7: 10, 8: 12 };
  const nextStep = current + 1;

  if (nextStep > 8) {
    // Sequence complete
    db.prepare(`
      UPDATE leads SET sequence_status = 'completed', next_email_at = NULL, next_email_step = 0,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(leadId);
    return;
  }

  const offsetDays = dayOffsets[nextStep] || (nextStep * 2);
  const now = new Date();
  const nextAt = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);

  // If proposal step, mark proposal_sent_at
  if (nextStep === 2 && !lead.proposal_sent_at) {
    db.prepare('UPDATE leads SET proposal_sent_at = ? WHERE id = ?').run(new Date().toISOString(), leadId);
  }

  db.prepare(`
    UPDATE leads SET next_email_step = ?, next_email_at = ?,
      sequence_status = 'active', updated_at = datetime('now')
    WHERE id = ?
  `).run(nextStep, nextAt.toISOString(), leadId);
}

/**
 * Build email content for a given step.
 */
function buildEmailForStep(lead, step) {
  switch (step) {
    case 1: {
      // Scan results — only if not already sent
      if (lead.scanEmailSent) return null;
      const sig = lead.signals || {};
      const strengths = [];
      const problems = [];
      const actions = [];
      if (sig.hasTitle) strengths.push('Title tag is properly configured');
      if (sig.mobileViewport) strengths.push('Site is mobile-friendly');
      if (sig.schemaCount > 0) strengths.push(`${sig.schemaCount} schema types detected`);
      if (!strengths.length) strengths.push('Basic website structure is in place');
      if (!sig.schemaCount) { problems.push('Schema markup is missing'); actions.push('Implement schema markup'); }
      if (!sig.hasServicePages) { problems.push('No dedicated service pages'); actions.push('Create dedicated service pages'); }
      if (!sig.hasBlog) { problems.push('No blog or fresh content'); actions.push('Launch AI-optimized content strategy'); }
      return EmailTemplates.scanEmail(lead, lead.scan_score || 0, strengths, problems, actions);
    }
    case 2: {
      // Proposal
      if (lead.proposalEmailSent) return null;
      const recap = `Your scan found ${lead.scan_score}/100. The biggest gaps are schema markup and AI readiness.`;
      const services = [
        { name: 'Schema & Technical Foundation', description: 'Full schema implementation plus technical SEO fixes' },
        { name: 'AI Content Engine', description: 'Monthly AI-optimized content targeting high-intent keywords' },
        { name: 'AI Visibility Package', description: 'Entity SEO, GBP optimization, citations, and review generation' },
      ];
      return EmailTemplates.proposalEmail(lead, recap, services,
        lead.proposal_price || '$997/mo', lead.proposal_buy_url, lead.proposal_call_url);
    }
    case 3:
      return EmailTemplates.followUpEmail(lead, 3, `Any questions about your AI Visibility proposal?`,
        `<p>I wanted to check in and see if you had any questions about the proposal I sent for <strong>${lead.business}</strong>.</p>`, '', lead.proposal_buy_url);
    case 4:
      return EmailTemplates.followUpEmail(lead, 4, `The biggest visibility gap we found for ${lead.business}`,
        `<p>During your scan, the most impactful finding was that your site is missing structured data and AI-optimized content. This means Google and AI systems like ChatGPT and Gemini have limited ability to recommend your business.</p>`, '', lead.proposal_buy_url);
    case 5:
      return EmailTemplates.followUpEmail(lead, 5, `How ${lead.business} can improve AI and Google visibility`,
        `<p>Based on your scan, here is the recommended approach:</p><ol><li>Implement schema markup (1-2 days)</li><li>Create individual service pages with AI-readable content</li><li>Launch monthly AI-optimized content strategy</li><li>Optimize GBP for local AI search</li></ol>`, '', lead.proposal_buy_url);
    case 6:
      return EmailTemplates.followUpEmail(lead, 6, 'Still interested in improving your online visibility?',
        `<p>I haven't heard back, but I wanted to make sure you're still interested. As AI search continues to grow, businesses that are clearly understood by these systems will have a significant advantage.</p>`, '', lead.proposal_buy_url);
    case 7:
      return EmailTemplates.followUpEmail(lead, 7, `Your AI Visibility Scan is still available`,
        `<p>Just a reminder that your AI Visibility Scan for <strong>${lead.business}</strong> is still available.</p>`, '', lead.proposal_buy_url);
    case 8:
      return EmailTemplates.followUpEmail(lead, 8, 'Final follow-up on your visibility proposal',
        `<p>This is the last message in this sequence. If you'd like to move forward, the proposal is ready. If now isn't the right time, feel free to reply anytime.</p>`, '', lead.proposal_buy_url);
    default:
      return null;
  }
}

/**
 * Schedule a lead's first email (step 1) immediately.
 * Called after scan completes.
 */
export function scheduleFirstEmail(leadId) {
  const db = getDb();
  const now = new Date();
  db.prepare(`
    UPDATE leads SET next_email_step = 1, next_email_at = ?,
      sequence_status = 'active', updated_at = datetime('now')
    WHERE id = ?
  `).run(now.toISOString(), leadId);
}

/**
 * Manually schedule a specific step for testing.
 */
export function scheduleStep(leadId, step, delayMinutes = 0) {
  const db = getDb();
  const at = new Date(Date.now() + delayMinutes * 60 * 1000);
  db.prepare(`
    UPDATE leads SET next_email_step = ?, next_email_at = ?,
      sequence_status = 'active', updated_at = datetime('now')
    WHERE id = ?
  `).run(step, at.toISOString(), leadId);
}
