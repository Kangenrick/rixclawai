/**
 * Email Service — direct Mailgun REST API
 * The Ranking Store API
 *
 * Sends via:
 *   POST https://api.mailgun.net/v3/mg.therankingstore.io/messages
 *
 * Authenticates using MAILGUN_API_KEY from environment.
 * Never exposes the API key in responses, logs, or URLs.
 * Never calls JSON.parse blindly — handles non-JSON responses safely.
 */
export class EmailService {
  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY;
    this.domain = process.env.MAILGUN_DOMAIN || 'mg.therankingstore.io';
    this.from = process.env.MAILGUN_FROM || 'Rick Fleming <rick@therankingstore.io>';
    this.replyTo = process.env.MAILGUN_REPLY_TO || 'rick@therankingstore.io';
    this.testMode = process.env.TEST_MODE !== 'false';
    this.testEmail = 'rick@therankingstore.io';
    this.internalEmail = 'rick@therankingstore.io';
    this.baseUrl = `https://api.mailgun.net/v3/${this.domain}/messages`;
    this.configured = !!this.apiKey;
  }

  isConfigured() {
    return this.configured;
  }

  /**
   * Send an email.
   * In TEST_MODE, all emails go to rick@therankingstore.io with [TEST] prefix.
   */
  async send({ to, subject, html, text }) {
    const recipient = this.testMode ? this.testEmail : to;
    const prefix = this.testMode ? '[TEST] ' : '';

    if (!this.configured) {
      console.warn('[Email] Mailgun not configured. Skipping send.');
      return { skipped: true, reason: 'Mailgun not configured' };
    }

    // Always BCC rick@therankingstore.io on real sends so Rick sees every scan
    const bcc = this.testMode ? undefined : this.internalEmail;
    return this._sendDirect(recipient, prefix + subject, html, text, bcc);
  }

  /**
   * Send via direct Mailgun REST API.
   * Handles non-JSON responses safely.
   */
  async _sendDirect(to, subject, html, text, bcc) {
    const formData = new URLSearchParams();
    formData.append('from', this.from);
    formData.append('to', to);
    if (bcc) formData.append('bcc', bcc);
    formData.append('subject', subject);
    formData.append('h:Reply-To', this.replyTo);
    if (html) formData.append('html', html);
    if (text) formData.append('text', text);

    const auth = Buffer.from(`api:${this.apiKey}`).toString('base64');

    let resp;
    try {
      resp = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
    } catch (err) {
      throw new Error(`Mailgun connection failed: ${err.message}`);
    }

    // Safely parse response body — Mailgun may return non-JSON
    let body;
    try {
      body = await resp.text();
    } catch {
      throw new Error(`Mailgun response unreadable (HTTP ${resp.status})`);
    }

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      // Non-JSON response (e.g. "Forbidden" plain text)
      throw new Error(
        `Mailgun returned HTTP ${resp.status}: ${body.substring(0, 200).replace(/\n/g, ' ')}`
      );
    }

    if (!resp.ok) {
      throw new Error(
        `Mailgun error ${resp.status}: ${parsed.message || parsed.error || JSON.stringify(parsed).substring(0, 200)}`
      );
    }

    return parsed;
  }

  /**
   * Send a single test email to rick@therankingstore.io.
   * Used by the admin test endpoint.
   */
  async sendTest() {
    return this.send({
      to: this.testEmail,
      subject: 'Test Email from The Ranking Store API',
      text: 'This is a test email to confirm Mailgun is configured correctly.\n\nRick Fleming\nThe Ranking Store',
      html: '<p>This is a test email to confirm Mailgun is configured correctly.</p><p>Rick Fleming<br>The Ranking Store</p>',
    });
  }
}

export const emailService = new EmailService();