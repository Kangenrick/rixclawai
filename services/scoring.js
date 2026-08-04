/**
 * Scoring Engine — transparent 0-100 AI Visibility Score
 * The Ranking Store API
 */
export class ScoringEngine {
  constructor() {
    this.weights = {
      websiteHealth: 0.10, technicalSEO: 0.15, entityClarity: 0.15,
      schemaCoverage: 0.15, localAuthority: 0.15, reviewsTrust: 0.10,
      contentAuthority: 0.10, aiReadiness: 0.10,
    };
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    Object.keys(this.weights).forEach(k => { this.weights[k] /= total; });
  }

  scoreWebsiteHealth(s) {
    let score = 0, c = 0;
    if (typeof s.httpOk === 'boolean') { score += s.httpOk ? 100 : 30; c++; }
    if (typeof s.https === 'boolean') { score += s.https ? 100 : 50; c++; }
    if (typeof s.mobileViewport === 'boolean') { score += s.mobileViewport ? 100 : 40; c++; }
    return c ? Math.round(score / c) : null;
  }

  scoreTechnicalSEO(s) {
    let score = 0, c = 0;
    const checks = [
      ['hasTitle', 100, 40], ['hasMetaDescription', 100, 40],
      ['hasCanonical', 100, 50], ['hasHeadingStructure', 100, 40],
      ['hasRobotsTxt', 100, 60], ['indexable', 100, 30],
    ];
    checks.forEach(([k, p, f]) => {
      if (typeof s[k] === 'boolean') { score += s[k] ? p : f; c++; }
    });
    return c ? Math.round(score / c) : null;
  }

  scoreEntityClarity(s) {
    let score = 0, c = 0;
    const checks = [
      ['hasContactInfo', 100, 40], ['hasAboutInfo', 100, 40],
      ['businessNameConsistent', 100, 30], ['hasServiceClarity', 100, 30],
      ['hasLocationClarity', 100, 30],
    ];
    checks.forEach(([k, p, f]) => {
      if (typeof s[k] === 'boolean') { score += s[k] ? p : f; c++; }
    });
    return c ? Math.round(score / c) : null;
  }

  scoreSchemaCoverage(s) {
    if (!s.schemaTypes || s.schemaTypes.length === 0) return 0;
    const expected = ['LocalBusiness', 'Organization', 'Service', 'FAQPage'];
    const found = new Set(s.schemaTypes);
    return expected.reduce((a, t) => a + (found.has(t) ? 25 : 0), 0);
  }

  scoreLocalAuthority(s) {
    let score = 0, c = 0;
    const checks = [
      ['hasGBP', 100, 20], ['napConsistent', 100, 40],
      ['hasServiceArea', 100, 40], ['hasLocationPage', 100, 40],
    ];
    checks.forEach(([k, p, f]) => {
      if (typeof s[k] === 'boolean') { score += s[k] ? p : f; c++; }
    });
    return c ? Math.round(score / c) : null;
  }

  scoreReviewsTrust(s) {
    let score = 0, c = 0;
    const checks = [
      ['hasReviews', 100, 30], ['hasTestimonials', 100, 40],
      ['hasPrivacyPolicy', 100, 40], ['hasTerms', 100, 40],
      ['hasContactTransparency', 100, 30],
    ];
    checks.forEach(([k, p, f]) => {
      if (typeof s[k] === 'boolean') { score += s[k] ? p : f; c++; }
    });
    return c ? Math.round(score / c) : null;
  }

  scoreContentAuthority(s) {
    let score = 0, c = 0;
    const checks = [
      ['hasBlog', 100, 30], ['hasFAQ', 100, 40],
      ['hasServicePages', 100, 30], ['topicalDepth', 100, 40],
    ];
    checks.forEach(([k, p, f]) => {
      if (typeof s[k] === 'boolean') { score += s[k] ? p : f; c++; }
    });
    return c ? Math.round(score / c) : null;
  }

  scoreAIReadiness(s) {
    let score = 0, c = 0;
    const checks = [
      ['aiCrawlerAccessible', 100, 30], ['hasMachineReadableContext', 100, 30],
      ['hasAnswerability', 100, 40], ['topicalDepth', 100, 50],
    ];
    checks.forEach(([k, p, f]) => {
      if (typeof s[k] === 'boolean') { score += s[k] ? p : f; c++; }
    });
    return c ? Math.round(score / c) : null;
  }

  compute(signals) {
    const categories = {
      websiteHealth: this.scoreWebsiteHealth(signals),
      technicalSEO: this.scoreTechnicalSEO(signals),
      entityClarity: this.scoreEntityClarity(signals),
      schemaCoverage: this.scoreSchemaCoverage(signals),
      localAuthority: this.scoreLocalAuthority(signals),
      reviewsTrust: this.scoreReviewsTrust(signals),
      contentAuthority: this.scoreContentAuthority(signals),
      aiReadiness: this.scoreAIReadiness(signals),
    };

    let weightedTotal = 0, weightUsed = 0;
    const labels = {
      websiteHealth: 'Website Health', technicalSEO: 'Technical SEO',
      entityClarity: 'Entity Clarity', schemaCoverage: 'Schema Coverage',
      localAuthority: 'Local Authority', reviewsTrust: 'Reviews & Trust',
      contentAuthority: 'Content Authority', aiReadiness: 'AI Readiness',
    };

    Object.keys(this.weights).forEach(key => {
      if (categories[key] !== null && categories[key] !== undefined) {
        weightedTotal += categories[key] * this.weights[key];
        weightUsed += this.weights[key];
      }
    });

    let overall = null, confidence = 'low';
    if (weightUsed > 0) {
      overall = Math.round(weightedTotal / weightUsed);
      const dataCount = Object.values(categories).filter(v => v !== null && v !== undefined).length;
      if (dataCount >= 6) confidence = 'high';
      else if (dataCount >= 4) confidence = 'medium';
    }

    return { overall, confidence, categories, labels };
  }
}