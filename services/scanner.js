/**
 * Scan Engine — analyzes a website and collects signals for scoring
 * The Ranking Store API
 */
export class ScanEngine {
  async scan(url) {
    const signals = {
      url, scannedAt: new Date().toISOString(),
      httpOk: false, https: false, pageLoadOk: false,
      hasTitle: false, hasMetaDescription: false, hasCanonical: false,
      hasHeadingStructure: false, hasRobotsTxt: false, hasSitemap: false,
      indexable: true, mobileViewport: false,
      schemaTypes: [], schemaCount: 0,
      hasContactInfo: false, hasAboutInfo: false,
      businessNameConsistent: false, hasServiceClarity: false, hasLocationClarity: false,
      hasGBP: false, napConsistent: false, hasServiceArea: false, hasLocationPage: false,
      hasReviews: false, hasTestimonials: false,
      hasPrivacyPolicy: false, hasTerms: false, hasContactTransparency: false,
      hasBlog: false, hasFAQ: false, hasServicePages: false, topicalDepth: false,
      aiCrawlerAccessible: false, hasMachineReadableContext: false, hasAnswerability: false,
      competitorCount: 0, competitorDataUnavailable: true, competitorAvgSchema: 0,
      socialProfiles: [],
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        method: 'HEAD', signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RankingStoreBot/1.0; +https://therankingstore.io)' },
        redirect: 'manual',
      });
      clearTimeout(timeout);
      signals.httpOk = resp.status >= 200 && resp.status < 400;
      signals.https = url.startsWith('https');
      if ([301, 302, 307, 308].includes(resp.status)) signals.redirects = resp.headers.get('location');
    } catch { signals.httpOk = false; }

    if (!signals.httpOk) return signals;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RankingStoreBot/1.0; +https://therankingstore.io)' },
      });
      clearTimeout(timeout);
      const html = await resp.text();
      signals.pageLoadOk = true;

      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      signals.hasTitle = !!(titleMatch && titleMatch[1].trim().length > 0);
      signals.title = titleMatch ? titleMatch[1].trim() : '';

      const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      signals.hasMetaDescription = !!(metaDesc && metaDesc[1].trim().length > 0);

      const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
      signals.hasCanonical = !!canonical;
      signals.mobileViewport = /<meta[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html);

      const h1s = (html.match(/<h1[^>]*>/gi) || []).length;
      const h2s = (html.match(/<h2[^>]*>/gi) || []).length;
      signals.hasHeadingStructure = h1s >= 1 && h2s >= 1;

      const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
      const schemaTypes = new Set();
      jsonLdBlocks.forEach(block => {
        try {
          const content = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
          const parsed = JSON.parse(content);
          const items = parsed['@graph'] || [parsed];
          items.forEach(item => {
            if (item['@type']) {
              schemaTypes.add(item['@type'].replace(/^https?:\/\/schema\.org\//, ''));
            }
          });
        } catch { /* skip invalid JSON-LD */ }
      });
      signals.schemaTypes = [...schemaTypes];
      signals.schemaCount = signals.schemaTypes.length;

      signals.hasRobotsTxt = /<meta[^>]*name=["']robots["']/i.test(html);
      signals.hasContactInfo = /contact|call\s*:|phone|email/i.test(html.substring(0, 5000));
      signals.hasAboutInfo = /about/i.test(html);
      signals.hasServiceClarity = /service|repair|install|offer|provide/i.test(html.substring(0, 3000));
      signals.hasLocationClarity = /\b(PA|Pennsylvania|Barto|Alburtis|Bally|Boyertown|Philadelphia)\b/i.test(html.substring(0, 3000));
      signals.hasPrivacyPolicy = /privacy/i.test(html);
      signals.hasTerms = /terms/i.test(html);
      signals.hasTestimonials = /testimonial|review/i.test(html);
      signals.hasBlog = /blog|news|articles/i.test(html);
      signals.hasFAQ = /faq|questions|answers/i.test(html);
      signals.hasServicePages = (html.match(/href=["'][^"']*(?:service|repair|install|replacement)["']/gi) || []).length >= 2;

      if (/facebook\.com/i.test(html)) signals.socialProfiles.push('Facebook');
      if (/linkedin\.com/i.test(html)) signals.socialProfiles.push('LinkedIn');
      if (/instagram\.com/i.test(html)) signals.socialProfiles.push('Instagram');

      signals.aiCrawlerAccessible = true;
      signals.hasMachineReadableContext = signals.schemaCount > 0;
      signals.hasAnswerability = signals.hasFAQ || signals.hasServicePages;
      signals.topicalDepth = signals.hasBlog || signals.hasServicePages;
      signals.businessNameConsistent = true;
    } catch { signals.pageLoadOk = false; }

    return signals;
  }
}