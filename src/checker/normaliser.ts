import { ScrapeResult, Status, ScrapeSignals } from '../core/types';

const CTA_KEYWORDS = ['add to bag', 'add to basket', 'add to cart', 'buy now', 'checkout'];
const OOS_PHRASES = ['out of stock', 'sold out', 'notify me when in stock', 'currently unavailable'];
const SOON_PHRASES = ['coming soon', 'pre-order', 'preorder', 'launches'];

export function normalise(result: ScrapeResult): ScrapeResult {
  const { signals } = result;
  const title = result.title ?? signals.title;
  const price = result.price ?? signals.priceText;
  const variantsSummary = result.variantsSummary ?? signals.variantsAvailable?.join(', ');

  const status = determineStatus(signals, result.status);

  return {
    status,
    title,
    price,
    variantsSummary,
    signals,
  };
}

export function determineStatus(signals: ScrapeSignals, fallback: Status = 'UNKNOWN'): Status {
  if (ctaAvailable(signals)) return 'AVAILABLE';
  if (matchesList(signals.oosTexts, OOS_PHRASES)) return 'NOT_AVAILABLE';
  if (matchesList(signals.soonTexts, SOON_PHRASES)) return 'COMING_SOON';
  const schema = signals.schemaAvailability?.toLowerCase();
  if (schema) {
    if (schema.includes('instock')) return 'AVAILABLE';
    if (schema.includes('outofstock')) return 'NOT_AVAILABLE';
    if (schema.includes('preorder') || schema.includes('presale')) return 'COMING_SOON';
  }
  if (typeof signals.inStockFlag === 'boolean') {
    return signals.inStockFlag ? 'AVAILABLE' : 'NOT_AVAILABLE';
  }
  return fallback;
}

function ctaAvailable(signals: ScrapeSignals): boolean {
  const texts = signals.ctaTexts.map((t) => t.toLowerCase());
  if (!signals.ctaEnabled) return false;
  return CTA_KEYWORDS.some((kw) => texts.some((t) => t.includes(kw)));
}

function matchesList(values: string[], targets: string[]): boolean {
  return values.some((value) => {
    const lower = value.toLowerCase();
    return targets.some((target) => lower.includes(target));
  });
}
