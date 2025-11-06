import { describe, it, expect } from 'vitest';
import { normaliseUrl } from '../src/core/url';

describe('url helpers', () => {
  it('strips marketing params and fragments', async () => {
    const input = 'https://example.com/p?utm_source=ad&b=1&a=2#details';
    const result = await normaliseUrl(input);
    expect(result.normalizedUrl).toBe('https://example.com/p?a=2&b=1');
  });

  it('produces stable hash for equivalent URLs', async () => {
    const first = await normaliseUrl('https://example.com/p?a=1&b=2');
    const second = await normaliseUrl('https://example.com/p?b=2&a=1');
    expect(first.urlHash).toBe(second.urlHash);
  });
});
