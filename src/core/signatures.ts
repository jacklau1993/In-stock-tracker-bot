const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}

export async function hashContentSnippet(html: string): Promise<string> {
  const slice = 8 * 1024;
  const start = html.slice(0, slice);
  const end = html.length > slice ? html.slice(-slice) : '';
  return hashBytes(encoder.encode(start + end));
}

export interface ConditionalHeaders {
  etag?: string | null;
  lastModified?: string | null;
}

export function extractConditionalHeaders(headers: Headers): ConditionalHeaders {
  return {
    etag: headers.get('etag'),
    lastModified: headers.get('last-modified'),
  };
}

export function applyConditionalHeaders(
  headers: HeadersInit,
  opts: { etag?: string | null; lastModified?: string | null }
): HeadersInit {
  const next = new Headers(headers);
  if (opts.etag) next.set('If-None-Match', opts.etag);
  if (opts.lastModified) next.set('If-Modified-Since', opts.lastModified);
  return next;
}
