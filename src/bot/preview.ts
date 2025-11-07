import { ACCEPT_LANGUAGE, DEFAULT_REQUEST_TIMEOUT_MS, USER_AGENT } from '../core/config';
import { parsePage } from '../checker/parser';
import { normalise } from '../checker/normaliser';
import type { ScrapeResult } from '../core/types';

export async function previewProduct(url: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': ACCEPT_LANGUAGE,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch product: ${res.status}`);
    }
    const html = await res.text();
    const host = new URL(url).host;
    const parsed = parsePage(html, host, res.headers);
    return normalise(parsed);
  } finally {
    clearTimeout(timeout);
  }
}
