import { ACCEPT_LANGUAGE, DEFAULT_REQUEST_TIMEOUT_MS, USER_AGENT } from '../core/config';
import { FetchError } from '../core/errors';
import { Track, EnvBindings } from '../core/types';

export interface FetchOutcome {
  status: 'ok' | 'not-modified';
  html?: string;
  headers: Headers;
}

export async function fetchTrack(track: Track, env: EnvBindings): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timeoutMs = Number(env.REQUEST_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers({
      'User-Agent': USER_AGENT,
      'Accept-Language': ACCEPT_LANGUAGE,
    });
    if (track.etag) headers.set('If-None-Match', track.etag);

    const res = await fetch(track.url, { headers, signal: controller.signal });
    if (res.status === 304) {
      return { status: 'not-modified', headers: res.headers };
    }
    if (!res.ok) {
      throw new FetchError('Request failed', res.status);
    }
    const html = await res.text();
    return { status: 'ok', html, headers: res.headers };
  } catch (err) {
    if (err instanceof FetchError) throw err;
    throw new FetchError((err as Error).message);
  } finally {
    clearTimeout(timeout);
  }
}
