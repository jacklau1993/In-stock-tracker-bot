const MARKETING_PARAMS = new Set([
  'gclid',
  'fbclid',
  'msclkid',
  'yclid',
  'gbraid',
  'wbraid',
]);

export interface NormalisedUrl {
  normalizedUrl: string;
  siteHost: string;
  urlHash: string;
}

const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function normaliseUrl(raw: string): Promise<NormalisedUrl> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('URL must be http/https');
  }

  url.hash = '';

  const params = Array.from(url.searchParams.entries()).filter(([key]) => {
    if (key.startsWith('utm_')) return false;
    if (MARKETING_PARAMS.has(key)) return false;
    return true;
  });

  params.sort(([a], [b]) => a.localeCompare(b));

  url.search = '';
  for (const [key, value] of params) {
    url.searchParams.append(key, value);
  }

  const normalizedUrl = url.toString();
  const siteHost = url.host.toLowerCase();
  const urlHash = await sha256Hex(normalizedUrl);
  return { normalizedUrl, siteHost, urlHash };
}

export async function hashContent(value: string): Promise<string> {
  return sha256Hex(value);
}
