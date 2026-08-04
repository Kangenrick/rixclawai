/**
 * Email Templates — Professional, high-trust email sequence
 * The Ranking Store API
 */

function wrapBody(body) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto">
<div style="background:linear-gradient(135deg,#080d19,#173367);color:#fff;padding:32px;text-align:center;border-radius:16px 16px 0 0">
<div style="font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#7fe1ff;margin-bottom:4px">The Ranking Store</div>
</div>
<div style="padding:32px;border:1px solid #dfe5ef;border-top:0;border-radius:0 0 16px 16px;background:#fff">
${body}
<div style="border-top:1px solid #dfe5ef;margin-top:24px;padding-top:16px;font-size:.82rem;color:#5f6b82">
<p style="margin:2px 0">Rick Fleming</p>
<p style="margin:2px 0">The Ranking Store</p>
<p style="margin:2px 0"><a href="mailto:rick@therankingstore.io" style="color:#2f6bff">rick@therankingstore.io</a></p>
<p style="margin:2px 0;font-size:.75rem;color:#8f9bb0"><a href="{{unsubscribe_url}}" style="color:#8f9bb0">Unsubscribe</a></p>
</div>
</div>
</div>`;
}

function buyBtn(text, url, leadId) {
  const href = url && leadId ? `${url}?lid=${leadId}&src=trs` : url || '[BUY BUTTON URL]';
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#2f6bff,#6a4cff);color:#fff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:800;font-size:1rem;margin:8px 4px">${text}</a>`;
}

function scoreBox(score) {
  const color = score >= 70 ? '#1e8449' : score >= 40 ? '#b7950b' : '#c0392b';
  return `<div style="text-align:center;padding:24px;background:#f7f9fc;border-radius:12px;margin:24px 0">
<div style="font-size:3rem;font-weight:900;color:${color}">${score}</div>
<div style="color:#5f6b82">AI Visibility Score</div>
</div>`;
}

/**
 * EMAIL 1: Scan Results — Professional, not salesy
 */
export function scanEmail(lead, score, strengths, problems, actions) {
  const color = score >= 70 ? '#1e8449' : score >= 40 ? '#b7950b' : '#c0392b';
  return {
    subject: `Your AI Visibility Scan for ${lead.business}`,
    html: wrapBody(`
      <p style="font-size:1.05rem;margin:0 0 16px">Hi ${lead.name},</p>
      <p>Your complimentary AI Visibility Scan for <strong>${lead.business}</strong> has been completed.</p>
      ${scoreBox(score)}
      <p style="font-size:.88rem;color:#5f6b82">Your score of <strong style="color:${color}">${score}/100</strong> reflects how clearly your business is understood by search engines and AI-powered discovery platforms including Google Search, AI Overviews, ChatGPT, and Gemini.</p>

      <h3 style="font-size:.95rem;margin:20px 0 8px">What was scanned</h3>
      <ul style="font-size:.85rem;color:#47536a;padding-left:18px">
        <li>Website technical structure and accessibility</li>
        <li>Schema markup and structured data</li>
        <li>Content depth and topical authority</li>
        <li>Local search signals and Google Business Profile</li>
        <li>Review and trust signals</li>
        <li>AI readiness and machine-readable context</li>
      </ul>

      ${strengths.length ? `<h3 style="font-size:.95rem;margin:20px 0 8px">What we found working well</h3><ul style="font-size:.85rem;color:#47536a;padding-left:18px">${strengths.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}

      ${problems.length ? `<h3 style="font-size:.95rem;margin:20px 0 8px">Areas that may need attention</h3><ul style="font-size:.85rem;color:#47536a;padding-left:18px">${problems.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}

      <div style="background:#fef9e7;border-left:4px solid #f0c040;padding:16px;border-radius:8px;margin:24px 0">
        <p style="margin:0;color:#5a4a1a;font-size:.88rem">
          <strong>What happens next.</strong> We are preparing a personalized implementation proposal based on your scan results. It will include specific recommendations matched to the findings above.
        </p>
        <p style="margin:8px 0 0;color:#5a4a1a;font-size:.88rem">
          You will receive it within approximately 24 hours.
        </p>
      </div>

      <p style="font-size:.88rem;color:#5f6b82">If you have any questions in the meantime, reply to this email. Rick reviews every scan personally.</p>

      <p style="color:#5f6b82;font-size:.85rem;margin-top:24px">Best,<br>Rick Fleming<br>The Ranking Store</p>
    `),
    text: `Hi ${lead.name},\n\nYour AI Visibility Scan for ${lead.business} has been completed.\n\nOverall Score: ${score}/100\n\nWhat was scanned: Website structure, schema, content, local search, reviews, and AI readiness.\n\nWe are preparing a personalized implementation proposal based on your results. You will receive it within approximately 24 hours.\n\nBest,\nRick Fleming\nThe Ranking Store`,
  };
}

/**
 * EMAIL 2: Proposal
 */
export function proposalEmail(lead, recap, services, price, buyUrl, callUrl) {
  const servicesHtml = services.map(s =>
    `<div style="background:#f7f9fc;border-radius:12px;padding:16px;margin:12px 0">
      <strong>${s.name}</strong>
      <p style="color:#5f6b82;margin:4px 0 0;font-size:.88rem">${s.description}</p>
      ${s.reason ? `<p style="color:#47536a;margin:4px 0 0;font-size:.82rem;font-style:italic">Why this matters: ${s.reason}</p>` : ''}
    </div>`
  ).join('');

  return {
    subject: `Your Personalized Visibility Proposal for ${lead.business}`,
    html: wrapBody(`
      <p style="font-size:1.05rem;margin:0 0 16px">Hi ${lead.name},</p>
      <p>Here is your personalized proposal based on your AI Visibility Scan for <strong>${lead.business}</strong>.</p>
      <div style="background:#fef9e7;border-left:4px solid #f0c040;padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:0;color:#5a4a1a;font-size:.88rem"><strong>Recap:</strong> ${recap}</p>
      </div>
      <p><strong>Recommended approach:</strong></p>
      ${servicesHtml}
      <div style="text-align:center;padding:24px;margin:24px 0">
        <p style="font-size:1.5rem;font-weight:900;color:#0b1020;margin:0">${price}</p>
        ${buyBtn('Get Started', buyUrl, lead.id)}
        ${callUrl ? buyBtn('Book a Call', callUrl, lead.id) : ''}
      </div>
      <p>I am available to answer any questions. Reply to this email or book a call above.</p>
      <p style="color:#5f6b82;font-size:.85rem;margin-top:24px">Best,<br>Rick Fleming<br>The Ranking Store</p>
    `),
    text: `Hi ${lead.name},\n\nYour personalized proposal for ${lead.business} is ready.\n\n${recap}\n\nPrice: ${price}\n\nBest,\nRick Fleming\nThe Ranking Store`,
  };
}

/**
 * Follow-up emails
 */
export function followUpEmail(lead, step, subject, intro, body, buyUrl, callUrl) {
  return {
    subject: subject || `Follow-up on your AI Visibility Scan`,
    html: wrapBody(`
      <p style="font-size:1.05rem;margin:0 0 16px">Hi ${lead.name},</p>
      ${intro || `<p>I wanted to follow up on your AI Visibility Scan for <strong>${lead.business}</strong>.</p>`}
      ${body || ''}
      <div style="text-align:center;margin:24px 0">
        ${buyBtn('Get Started', buyUrl, lead.id)}
        ${callUrl ? buyBtn('Book a Call', callUrl, lead.id) : ''}
      </div>
      ${step === 8 ? '<p style="color:#5f6b82;font-style:italic">This is the final message in this sequence. You can reply anytime if you would like to revisit this.</p>' : ''}
      <p style="color:#5f6b82;font-size:.85rem;margin-top:24px">Best,<br>Rick Fleming<br>The Ranking Store</p>
    `),
    text: `Hi ${lead.name},\n\n${intro || ''}\n\nBest,\nRick Fleming\nThe Ranking Store`,
  };
}