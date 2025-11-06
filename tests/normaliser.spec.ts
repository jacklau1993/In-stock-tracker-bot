import { describe, it, expect } from 'vitest';
import { normalise } from '../src/checker/normaliser';
import type { ScrapeSignals } from '../src/core/types';

const baseSignals: ScrapeSignals = {
  ctaTexts: [],
  ctaEnabled: false,
  oosTexts: [],
  soonTexts: [],
  schemaAvailability: undefined,
  inStockFlag: undefined,
  variantsAvailable: undefined,
  title: undefined,
  priceText: undefined,
};

describe('normaliser', () => {
  it('prioritises CTA availability over OOS text', () => {
    const res = normalise({
      status: 'UNKNOWN',
      signals: {
        ...baseSignals,
        ctaTexts: ['Add to Cart'],
        ctaEnabled: true,
        oosTexts: ['Out of stock'],
      },
    });
    expect(res.status).toBe('AVAILABLE');
  });

  it('maps schema availability when CTA missing', () => {
    const res = normalise({
      status: 'UNKNOWN',
      signals: {
        ...baseSignals,
        schemaAvailability: 'https://schema.org/OutOfStock',
      },
    });
    expect(res.status).toBe('NOT_AVAILABLE');
  });

  it('falls back to previous status when no signals', () => {
    const res = normalise({
      status: 'COMING_SOON',
      signals: baseSignals,
    });
    expect(res.status).toBe('COMING_SOON');
  });
});
