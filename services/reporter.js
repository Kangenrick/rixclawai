/**
 * Report Generator — Premium, comprehensive 21-section scan report
 * The Ranking Store API
 *
 * Designed to feel like a professional consulting engagement worth several hundred dollars.
 * Each section includes: Summary, Score, Why It Matters, Findings, Impact, Priority, Fixes.
 */

const BRAND = 'The Ranking Store';

function progressBar(score) {
  const pct = Math.min(Math.max(score || 0, 0), 100);
  const color = pct >= 80 ? '#1e8449' : pct >= 50 ? '#b7950b' : '#c0392b';
  const label = pct >= 80 ? 'Strong' : pct >= 50 ? 'Needs Improvement' : 'Requires Attention';
  return `<div style="margin:12px 0">
    <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px">
      <span>${pct}/100</span><span style="color:${color};font-weight:800">${label}</span>
    </div>
    <div style="background:#dfe5ef;border-radius:99px;height:8px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:99px;transition:width .6s"></div>
    </div>
  </div>`;
}

function scoreCard(overall, confidence) {
  const color = overall >= 70 ? '#1e8449' : overall >= 40 ? '#b7950b' : '#c0392b';
  const label = overall >= 80 ? 'Excellent' : overall >= 60 ? 'Good' : overall >= 40 ? 'Fair' : 'Needs Improvement';
  return `<div class="score-box" style="background:linear-gradient(145deg,#fff,#f7f9fc);border:1px solid #dfe5ef;border-radius:20px;padding:32px;text-align:center;margin:24px 0;box-shadow:0 12px 40px rgba(11,16,32,.1)">
    <div style="font-size:4rem;font-weight:900;color:${color};line-height:1">${overall}</div>
    <div style="color:#5f6b82;margin-top:4px;font-size:1.1rem">AI Visibility Score</div>
    <div style="color:#5f6b82;font-size:.8rem;margin-top:4px">${label} · Confidence: ${confidence || 'medium'}</div>
    ${progressBar(overall)}
  </div>`;
}

function severityTag(level) {
  const map = { critical: ['#c0392b','#fde8e8'], high: ['#b7950b','#fef9e7'], medium: ['#1e8449','#e8f8f0'], low: ['#2f6bff','#edf3ff'] };
  const [color, bg] = map[level] || ['#5f6b82','#f0f0f0'];
  return `<span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:.7rem;font-weight:800;text-transform:uppercase;background:${bg};color:${color}">${level}</span>`;
}

function section(title, content) {
  return `<div class="section" style="margin:36px 0"><h2 style="font-size:1.3rem;border-bottom:2px solid #f0c040;padding-bottom:8px;margin:0 0 16px">${title}</h2>${content}</div>`;
}

function categoryRow(label, score, why, findings, impact, priority, fixes, difficulty, estImpact) {
  const pct = Math.min(Math.max(score || 0, 0), 100);
  const color = pct >= 80 ? '#1e8449' : pct >= 50 ? '#b7950b' : '#c0392b';
  const labelText = pct >= 80 ? 'Strong' : pct >= 50 ? 'Fair' : 'Weak';
  return `<div style="background:#fff;border:1px solid #dfe5ef;border-radius:16px;padding:24px;margin:16px 0">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <h3 style="margin:0;font-size:1.05rem">${label}</h3>
      <div style="display:flex;align-items:center;gap:12px">
        ${severityTag(priority)}
        <span style="font-size:1.3rem;font-weight:900;color:${color}">${score}/100</span>
      </div>
    </div>
    ${progressBar(score)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
      <div><strong style="font-size:.82rem;color:#5f6b82;text-transform:uppercase">Why It Matters</strong><p style="margin:4px 0 0;font-size:.88rem;color:#47536a">${why}</p></div>
      <div><strong style="font-size:.82rem;color:#5f6b82;text-transform:uppercase">Current Findings</strong><p style="margin:4px 0 0;font-size:.88rem;color:#47536a">${findings}</p></div>
      <div><strong style="font-size:.82rem;color:#5f6b82;text-transform:uppercase">Business Impact</strong><p style="margin:4px 0 0;font-size:.88rem;color:#47536a">${impact}</p></div>
      <div><strong style="font-size:.82rem;color:#5f6b82;text-transform:uppercase">Recommended Fixes</strong><p style="margin:4px 0 0;font-size:.88rem;color:#47536a">${fixes}</p></div>
      <div><strong style="font-size:.82rem;color:#5f6b82;text-transform:uppercase">Implementation Difficulty</strong><p style="margin:4px 0 0;font-size:.88rem;color:#47536a">${difficulty}</p></div>
      <div><strong style="font-size:.82rem;color:#5f6b82;text-transform:uppercase">Estimated Impact</strong><p style="margin:4px 0 0;font-size:.88rem;color:#47536a">${estImpact}</p></div>
    </div>
  </div>`;
}

export class ReportGenerator {
  generateHtml(lead, signals, scores) {
    const s = scores.overall || '—';
    const cats = scores.categories || {};
    const labels = scores.labels || {};
    const conf = scores.confidence || 'medium';

    // Build the category score table
    let catRows = '';
    Object.keys(cats).forEach(key => {
      const val = cats[key];
      const label = labels[key] || key;
      const display = val !== null && val !== undefined ? `${val}/100` : 'No data';
      const color = val >= 80 ? '#1e8449' : val >= 50 ? '#b7950b' : '#c0392b';
      catRows += `<tr><td style="padding:10px 14px;border-bottom:1px solid #dfe5ef">${label}</td><td style="padding:10px 14px;border-bottom:1px solid #dfe5ef;text-align:right"><span style="font-weight:800;color:${color}">${display}</span></td></tr>`;
    });

    // Executive summary
    const summary = signals.httpOk === false && signals.pageLoadOk === false
      ? `<div style="background:#fde8e8;border:1px solid #f5c6c6;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#7b241c;font-size:.88rem"><strong>Note:</strong> The scan was unable to fully access the website. This may indicate a large corporate site, JavaScript-heavy framework, or access restrictions. Scores below reflect available data only. Some categories may show reduced scores due to limited crawl access rather than actual deficiencies.</p>
         </div>`
      : '';

    // Category detail cards
    let detailCards = '';
    const catDetails = {
      websiteHealth: { why: 'Search engines and AI systems must be able to access and render your site. A slow or inaccessible site limits visibility.', findings: signals.httpOk ? 'Site is reachable' : 'Site returned errors or was unreachable', impact: 'Directly affects indexing and crawl budget', priority: 'high', fixes: signals.httpOk ? 'Monitor uptime and improve Core Web Vitals' : 'Resolve server errors and ensure HTTPS works', difficulty: 'Low', estImpact: 'High' },
      technicalSEO: { why: 'Technical SEO ensures search engines can find, crawl, and index your pages correctly.', findings: signals.hasTitle ? 'Title tag present' : 'No title tag detected', impact: 'Affects all organic search visibility', priority: 'high', fixes: 'Add proper meta tags, headings, and structured URLs', difficulty: 'Medium', estImpact: 'High' },
      entityClarity: { why: 'AI systems need to clearly understand who you are, what you do, and where you operate.', findings: signals.hasContactInfo ? 'Contact info found' : 'No clear contact or business info detected', impact: 'Limits AI systems ability to recommend your business', priority: 'high', fixes: 'Add clear business name, address, phone, services, and service area to every page', difficulty: 'Low', estImpact: 'Very High' },
      schemaCoverage: { why: 'Schema markup is how you tell Google and AI systems exactly what your business is.', findings: signals.schemaCount > 0 ? `${signals.schemaCount} schema types found` : 'No schema markup detected', impact: 'Zero schema means AI systems must guess who you are', priority: 'critical', fixes: 'Implement LocalBusiness, Service, and FAQ schema', difficulty: 'Low', estImpact: 'Very High' },
      localAuthority: { why: 'Local search is how nearby customers find service businesses.', findings: signals.hasLocationClarity ? 'Location data present' : 'No location-specific signals found', impact: 'Limits local pack and map visibility', priority: 'high', fixes: 'Optimize Google Business Profile and add location pages', difficulty: 'Medium', estImpact: 'High' },
      reviewsTrust: { why: 'Reviews and trust signals directly influence both customer decisions and search rankings.', findings: signals.hasTestimonials ? 'Testimonials found' : 'No reviews or testimonials detected', impact: 'Reduces click-through rates and conversion', priority: 'medium', fixes: 'Implement review generation workflow', difficulty: 'Low', estImpact: 'Medium' },
      contentAuthority: { why: 'AI systems cite businesses with deep, authoritative content.', findings: signals.hasBlog ? 'Blog detected' : 'No blog or content depth found', impact: 'AI systems have limited information to cite about you', priority: 'medium', fixes: 'Launch monthly content targeting high-intent keywords', difficulty: 'Medium', estImpact: 'High' },
      aiReadiness: { why: 'AI search is growing rapidly. Businesses not understood by AI will be invisible in AI-powered results.', findings: signals.aiCrawlerAccessible ? 'AI crawlers can access site' : 'Limited AI crawler access detected', impact: 'Risk of being excluded from ChatGPT, Gemini, and AI Overviews', priority: 'high', fixes: 'Add machine-readable context, FAQ, and entity markup', difficulty: 'Medium', estImpact: 'Very High' },
    };

    Object.keys(cats).forEach(key => {
      const val = cats[key];
      const label = labels[key] || key;
      const d = catDetails[key] || { why: 'See executive summary', findings: 'Data available', impact: 'See recommendations', priority: 'medium', fixes: 'See recommendations', difficulty: 'Medium', estImpact: 'Medium' };
      if (val !== null && val !== undefined) {
        detailCards += categoryRow(label, val, d.why, d.findings, d.impact, d.priority, d.fixes, d.difficulty, d.estImpact);
      }
    });

    // Issues list
    let issuesHtml = '';
    if (!signals.schemaCount || signals.schemaCount === 0) {
      issuesHtml += this._issueCard('Critical', 'No Schema Markup', 'Zero schema types detected. Search engines and AI systems cannot verify your business.', 'Implement LocalBusiness, Service, and FAQ schema markup.', 'Very High', 'Low');
    }
    if (!signals.hasServicePages) {
      issuesHtml += this._issueCard('High', 'No Service Pages Detected', 'Individual services or products cannot rank independently in search.', 'Create dedicated pages for each service offering.', 'High', 'Medium');
    }
    if (!signals.hasBlog) {
      issuesHtml += this._issueCard('Medium', 'No Blog or Fresh Content', 'Google and AI systems favor sites that publish regularly.', 'Launch a monthly content strategy targeting high-intent keywords.', 'Medium', 'Medium');
    }
    if (!signals.hasTestimonials) {
      issuesHtml += this._issueCard('Medium', 'No Reviews or Testimonials', 'Social proof is missing. Reviews build trust with prospects and search engines.', 'Add testimonials and implement a review generation system.', 'Medium', 'Low');
    }
    if (!signals.hasFAQ) {
      issuesHtml += this._issueCard('Low', 'No FAQ Content', 'FAQ content helps capture featured snippets and voice search results.', 'Add an FAQ section addressing common customer questions.', 'Low', 'Low');
    }
    if (!issuesHtml) issuesHtml = '<p style="color:#1e8449">No significant issues detected based on available data.</p>';

    // Strengths
    let strengthsHtml = '';
    if (signals.hasTitle) strengthsHtml += '<li>Title tag is properly configured</li>';
    if (signals.hasMetaDescription) strengthsHtml += '<li>Meta description is present</li>';
    if (signals.mobileViewport) strengthsHtml += '<li>Mobile viewport is configured</li>';
    if (signals.schemaCount > 0) strengthsHtml += `<li>${signals.schemaCount} schema types detected</li>`;
    if (signals.hasContactInfo) strengthsHtml += '<li>Contact information is available</li>';
    if (signals.hasPrivacyPolicy) strengthsHtml += '<li>Privacy policy is present</li>';
    if (signals.hasTerms) strengthsHtml += '<li>Terms of service are present</li>';
    if (signals.hasBlog) strengthsHtml += '<li>Blog or news section detected</li>';
    if (signals.hasFAQ) strengthsHtml += '<li>FAQ content detected</li>';
    if (!strengthsHtml) strengthsHtml = '<li>No significant strengths detected — full audit recommended</li>';

    // Opportunities
    const opportunities = [
      !signals.schemaCount || signals.schemaCount === 0 ? 'Schema markup is completely missing. This is the single highest-impact improvement available.' : null,
      !signals.hasBlog ? 'No content marketing presence. Competitors with active blogs capture search traffic you are missing.' : null,
      !signals.hasServicePages ? 'No individual service pages. Each service should have its own dedicated landing page.' : null,
      !signals.hasFAQ ? 'FAQ content would help capture featured snippets and voice search queries.' : null,
      !signals.hasTestimonials ? 'Customer testimonials are not featured on the site.' : null,
      !signals.mobileViewport ? 'Site may not be fully mobile-optimized.' : null,
    ].filter(Boolean);
    const oppHtml = opportunities.length ? opportunities.map(o => `<li>${o}</li>`).join('') : '<li>No significant opportunities identified from available data.</li>';

    // Priority table
    const priorities = [
      !signals.schemaCount || signals.schemaCount === 0 ? { p: 'Critical', item: 'Implement schema markup (LocalBusiness, Service, Organization)', difficulty: 'Low', impact: 'Very High' } : null,
      !signals.hasServicePages ? { p: 'High', item: 'Create dedicated service/product pages', difficulty: 'Medium', impact: 'High' } : null,
      !signals.hasBlog ? { p: 'Medium', item: 'Launch blog with monthly content', difficulty: 'Medium', impact: 'High' } : null,
      !signals.hasTestimonials ? { p: 'Medium', item: 'Add testimonials and review generation', difficulty: 'Low', impact: 'Medium' } : null,
      !signals.hasFAQ ? { p: 'Low', item: 'Add FAQ content for featured snippets', difficulty: 'Low', impact: 'Medium' } : null,
      !signals.mobileViewport ? { p: 'High', item: 'Ensure mobile responsiveness', difficulty: 'Medium', impact: 'High' } : null,
    ].filter(Boolean);
    const priHtml = priorities.length
      ? `<table style="width:100%;border-collapse:collapse;font-size:.85rem;margin:16px 0">
          <tr><th style="padding:10px 12px;text-align:left;background:#0b1020;color:#fff;font-size:.7rem;text-transform:uppercase">Priority</th>
          <th style="padding:10px 12px;text-align:left;background:#0b1020;color:#fff;font-size:.7rem;text-transform:uppercase">Action</th>
          <th style="padding:10px 12px;text-align:left;background:#0b1020;color:#fff;font-size:.7rem;text-transform:uppercase">Difficulty</th>
          <th style="padding:10px 12px;text-align:left;background:#0b1020;color:#fff;font-size:.7rem;text-transform:uppercase">Impact</th></tr>`
        + priorities.map(pr =>
          `<tr><td style="padding:10px 12px;border-bottom:1px solid #dfe5ef">${severityTag(pr.p.toLowerCase())}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #dfe5ef">${pr.item}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #dfe5ef">${pr.difficulty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #dfe5ef">${pr.impact}</td></tr>`
        ).join('') + `</table>`
      : '<p>No priority fixes identified.</p>';

    // Build the full report
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Visibility Scan — ${lead.business}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#0b1020;line-height:1.6;margin:0;background:#f7f9fc;padding:0;-webkit-font-smoothing:antialiased}
.container{max-width:900px;margin:auto;padding:24px}
.header{background:linear-gradient(135deg,#080d19,#173367);color:#fff;padding:48px 24px;text-align:center;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 50%,rgba(56,198,255,.08),transparent 50%)}
.header h1{margin:0 0 8px;font-size:2rem;letter-spacing:-.03em;position:relative;z-index:1}
.header p{color:#c3ccdc;margin:4px 0;position:relative;z-index:1;font-size:.9rem}
.header .meta{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;margin-top:12px;position:relative;z-index:1;font-size:.82rem;color:#9ca8be}
.score-box{background:#fff;border:1px solid #dfe5ef;border-radius:20px;padding:32px;text-align:center;margin:24px 0;box-shadow:0 12px 40px rgba(11,16,32,.1)}
.section{margin:36px 0}
.section h2{font-size:1.3rem;border-bottom:2px solid #f0c040;padding-bottom:8px;margin:0 0 16px;letter-spacing:-.02em}
.section h3{font-size:1.05rem;margin:20px 0 8px}
table{width:100%;border-collapse:collapse;font-size:.85rem;margin:16px 0}
td,th{padding:10px 12px;border-bottom:1px solid #dfe5ef;text-align:left}
th{background:#0b1020;color:#fff;font-size:.7rem;text-transform:uppercase}
.issue-card{background:#fff;border:1px solid #dfe5ef;border-radius:16px;padding:20px;margin:14px 0;transition:box-shadow .2s}
.issue-card:hover{box-shadow:0 4px 20px rgba(11,16,32,.08)}
.issue-card h3{margin:0 0 4px;font-size:.95rem}
.issue-card p{margin:0;color:#5f6b82;font-size:.85rem}
.issue-card .meta{display:flex;gap:12px;margin-top:10px;flex-wrap:wrap;font-size:.82rem}
.footer{background:#0b1020;color:#fff;padding:32px 24px;text-align:center;font-size:.82rem;margin-top:32px}
.footer a{color:#c8d1e3}
.footer .brand{font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;color:#7fe1ff;margin-bottom:8px}
ul,ol{padding-left:20px;margin:8px 0}
li{margin:5px 0;color:#47536a;font-size:.88rem}
strong{color:#0b1020}
@media print{.header{break-inside:avoid}.section{break-inside:avoid}}
</style></head><body>
<div class="header">
<div class="brand">Complimentary Analysis</div>
<h1>AI Visibility Scan</h1>
<p>Prepared for <strong>${lead.business}</strong></p>
<div class="meta">
<span>${lead.city}, ${lead.state}</span>
<span>${lead.industry}</span>
<span>${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>
</div>
</div>
<div class="container">

${scoreCard(s, conf)}

${summary}

${section('1. Executive Summary', `
<p>This AI Visibility Scan evaluates how clearly your business is understood by search engines and AI-powered discovery platforms including Google Search, AI Overviews, ChatGPT, Gemini, Claude, and Perplexity.</p>
<p><strong>${lead.business}</strong> received an overall score of <strong>${s}/100</strong>${s >= 70 ? ', indicating a solid foundation with specific opportunities for improvement.' : s >= 40 ? ', indicating significant opportunities for improvement in key areas.' : ', indicating that substantial improvements are needed to compete effectively in AI-powered search.'}</p>
<p>The following report breaks down each category, explains why it matters, and provides prioritized recommendations.</p>
`)}

${section('2. Category Scores', `<table>${catRows}</table>`)}

${section('3. Detailed Category Analysis', detailCards)}

${section('4. Top Strengths', `<ul>${strengthsHtml}</ul>`)}

${section('5. Issues Found', issuesHtml)}

${section('6. Missed Opportunities', `<ul>${oppHtml}</ul>`)}

${section('7. Priority Action Plan', priHtml)}

${section('8. 30-Day Action Plan', `
<ol>
<li><strong>Week 1:</strong> Implement schema markup (LocalBusiness, Service, Organization)</li>
<li><strong>Week 2:</strong> Create individual service pages with unique, AI-readable content</li>
<li><strong>Week 3:</strong> Optimize Google Business Profile with posts, photos, and Q&A</li>
<li><strong>Week 4:</strong> Set up review generation workflow and add customer testimonials</li>
</ol>
`)}

${section('9. 90-Day Growth Roadmap', `
<ol>
<li><strong>Month 1:</strong> Technical foundation — schema, service pages, GBP optimization</li>
<li><strong>Month 2:</strong> Content engine — blog launch, FAQ content, service-area pages</li>
<li><strong>Month 3:</strong> Authority building — citations, directory listings, review growth, AI visibility monitoring</li>
</ol>
`)}

${section('10. Implementation Options', `
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px">
<div style="background:#fff;border:1px solid #dfe5ef;border-radius:16px;padding:20px;text-align:center">
<div style="font-size:1.5rem;font-weight:900;color:#2f6bff;margin-bottom:8px">1</div>
<h3 style="margin:0 0 6px;font-size:.95rem">Do It Yourself</h3>
<p style="color:#5f6b82;font-size:.82rem;margin:0">Receive the full report with prioritized fixes and implement on your own timeline.</p>
</div>
<div style="background:#fff;border:1px solid #dfe5ef;border-radius:16px;padding:20px;text-align:center">
<div style="font-size:1.5rem;font-weight:900;color:#1e8449;margin-bottom:8px">2</div>
<h3 style="margin:0 0 6px;font-size:.95rem">Done With You</h3>
<p style="color:#5f6b82;font-size:.82rem;margin:0">Guided support from Rick — monthly check-ins, strategy calls, and expert direction.</p>
</div>
<div style="background:#fff;border:1px solid #dfe5ef;border-radius:16px;padding:20px;text-align:center">
<div style="font-size:1.5rem;font-weight:900;color:#b7950b;margin-bottom:8px">3</div>
<h3 style="margin:0 0 6px;font-size:.95rem">Done For You</h3>
<p style="color:#5f6b82;font-size:.82rem;margin:0">Full-service implementation. The Ranking Store handles everything from schema to content to GBP.</p>
</div>
</div>
`)}

${section('11. Important Limitations', `
<p style="font-size:.85rem;color:#5f6b82">This scan is a complimentary analysis based on publicly available signals. Results may not reflect the full picture of your online presence. Some data may be unavailable due to website access restrictions, JavaScript requirements, or server configurations. No guarantee of rankings, AI recommendations, lead volume, or revenue is made or implied. Rick Fleming reviews every scan personally.</p>
`)}

</div>
<div class="footer">
<div class="brand">The Ranking Store</div>
<p>AI Visibility for Service Businesses</p>
<p>Rick Fleming — <a href="mailto:rick@therankingstore.io">rick@therankingstore.io</a></p>
<p style="color:#8f9bb0;font-size:.75rem;margin-top:8px">Lead ID: ${lead.id} | Referral Partner: Rick Fleming | Source: TheRankingStore.io</p>
</div>
</body></html>`;
  }

  _issueCard(priority, title, desc, fixes, impact, difficulty) {
    const map = { critical: ['#c0392b','#fde8e8'], high: ['#b7950b','#fef9e7'], medium: ['#1e8449','#e8f8f0'], low: ['#2f6bff','#edf3ff'] };
    const [color, bg] = map[priority] || ['#5f6b82','#f0f0f0'];
    return `<div class="issue-card" style="border-left:4px solid ${color}">
      <h3>${title}</h3>
      <p>${desc}</p>
      <div class="meta">
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="font-weight:700">Fix:</span> ${fixes}</span>
        <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;background:${bg};color:${color};font-weight:700">${priority}</span>
        <span>Impact: ${impact}</span>
        <span>Difficulty: ${difficulty}</span>
      </div>
    </div>`;
  }
}