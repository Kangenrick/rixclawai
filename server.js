import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDatabase, getDb } from './services/database.js';
import { LeadManager } from './services/lead-manager.js';
import { ScanEngine } from './services/scanner.js';
import { ScoringEngine } from './services/scoring.js';
import { ReportGenerator } from './services/reporter.js';
import { emailService } from './services/email.js';
import { startScheduler, scheduleFirstEmail } from './services/scheduler.js';
import * as EmailTemplates from './services/email-templates.js';

const PORT = process.env.PORT || 10000;
const NODE_ENV = (process.env.NODE_ENV || 'production').toLowerCase();
const TEST_MODE = (process.env.TEST_MODE || 'true').toLowerCase() === 'true';
const INTERNAL_EMAIL = process.env.INTERNAL_EMAIL || 'rick@therankingstore.io';
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

console.log('\n' + '='.repeat(55));
console.log('  The Ranking Store API - v2.2.0');
console.log('='.repeat(55) + '\n');
console.log('[Boot] Starting...');

const dbPath = process.env.DATABASE_PATH || './data/leads.db';
initDatabase();

const leadManager = new LeadManager();
const scanEngine = new ScanEngine();
const scoringEngine = new ScoringEngine();
const reportGenerator = new ReportGenerator();

const app = express();

// Health endpoint — FIRST, before all middleware, completely self-contained
app.get('/health', (req, res) => {
  try {
    let dbOk = false;
    try {
      getDb().prepare('SELECT 1').get();
      dbOk = true;
    } catch { /* silent */ }
    res.status(200).json({
      status: 'ok',
      version: '2.2.0',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      testMode: TEST_MODE,
      database: { status: dbOk ? 'connected' : 'pending', path: process.env.DATABASE_PATH || null },
      mailgun: { configured: Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

app.get('/', (req, res) => {
  res.status(200).json({ service: 'The Ranking Store API', version: '2.2.0', docs: '/health' });
});

app.use(cors({
  origin: ['https://therankingstore.io', 'https://www.therankingstore.io'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});
app.use('/api/', limiter);

app.post('/api/admin/test-email', async (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (ADMIN_SECRET && token !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await emailService.sendTest();
    res.json({ success: true, id: result?.id || 'ok' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/scan', async (req, res) => {
  try {
    const { name, business, website, email } = req.body;
    if (!name || !business || !website || !email) return res.status(400).json({ error: 'Missing required fields' });
    let url = website.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const lead = leadManager.create({ ...req.body, website: url });
    leadManager.update(lead.id, { status: 'Scanning', scan_status: 'Scanning' });
    res.json({ success: true, leadId: lead.id });
    try {
      const signals = await scanEngine.scan(url);
      const scores = scoringEngine.compute(signals);
      leadManager.update(lead.id, { scan_status: 'Complete', scan_date: new Date().toISOString(), scan_score: scores.overall, signals, scores, status: 'Scan Complete' });
      const reportHtml = reportGenerator.generateHtml(lead, signals, scores);
      leadManager.update(lead.id, { scan_report_html: reportHtml });
      scheduleFirstEmail(lead.id);
    } catch (err) {
      leadManager.update(lead.id, { scan_status: 'Failed', status: 'Needs Manual Review', errors: [err.message] });
    }
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: 'Internal error' }); }
});

app.get('/api/leads', (req, res) => { res.json(leadManager.list(req.query.status)); });
app.get('/api/leads/:id', (req, res) => { const l = leadManager.get(req.params.id); if (!l) return res.status(404).json({ error: 'Not found' }); res.json(l); });
app.get('/api/leads/:id/report', (req, res) => { const l = leadManager.get(req.params.id); if (!l) return res.status(404).json({ error: 'Not found' }); if (!l.scan_report_html) return res.status(400).json({ error: 'Not ready' }); res.set('Content-Type', 'text/html'); res.send(l.scan_report_html); });

app.listen(PORT, '0.0.0.0', () => {
  console.log('[Boot] Server listening on 0.0.0.0:' + PORT);
  console.log('[Boot] Environment: ' + NODE_ENV);
  console.log('[Boot] TEST_MODE: ' + (TEST_MODE ? 'ON - all emails to ' + INTERNAL_EMAIL : 'OFF'));
  console.log('[Boot] Mailgun: ' + (emailService.isConfigured() ? 'configured' : 'NOT configured'));
  console.log('[Boot] Scheduler: active');
  console.log('[Boot] Ready.\n');
  startScheduler();
});
