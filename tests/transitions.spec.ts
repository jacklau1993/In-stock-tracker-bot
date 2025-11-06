import { describe, it, expect } from 'vitest';
import { applyTransition } from '../src/checker/transitions';
import type { Track } from '../src/core/types';

const now = new Date('2024-01-01T00:00:00.000Z');

function makeTrack(overrides?: Partial<Track>): Track {
  return {
    id: 1,
    user_id: 1,
    url: 'https://example.com/product',
    url_hash: 'hash',
    site_host: 'example.com',
    status: 'UNKNOWN',
    status_conf_count: 0,
    fail_count: 0,
    backoff_sec: 60,
    needs_manual: 0,
    created_at: now.toISOString(),
    last_checked_at: null,
    next_check_at: null,
    title: null,
    price: null,
    variant_summary: null,
    etag: null,
    content_sig: null,
    ...overrides,
  } as Track;
}

describe('transitions', () => {
  it('requires two confirmations before alerting for AVAILABLE', () => {
    const first = applyTransition({
      track: makeTrack(),
      observedStatus: 'AVAILABLE',
      now,
      success: true,
      needsManual: false,
    });
    expect(first.alert).toBe(false);
    const second = applyTransition({
      track: { ...makeTrack({ status: 'AVAILABLE' }), status_conf_count: 1 },
      observedStatus: 'AVAILABLE',
      now,
      success: true,
      needsManual: false,
    });
    expect(second.alert).toBe(true);
  });

  it('resets confirmation when switching from COMING_SOON to NOT_AVAILABLE', () => {
    const track = makeTrack({ status: 'COMING_SOON', status_conf_count: 3 });
    const result = applyTransition({
      track,
      observedStatus: 'NOT_AVAILABLE',
      now,
      success: true,
      needsManual: false,
    });
    expect(result.patch.status_conf_count).toBe(1);
    expect(result.patch.status).toBe('NOT_AVAILABLE');
  });

  it('backs off on errors', () => {
    const track = makeTrack();
    const result = applyTransition({
      track,
      observedStatus: 'UNKNOWN',
      now,
      success: false,
      needsManual: false,
    });
    expect(result.patch.status).toBe('ERROR');
    expect(result.patch.fail_count).toBe(1);
    expect(result.patch.backoff_sec).toBeGreaterThan(0);
  });
});
