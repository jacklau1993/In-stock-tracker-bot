export const MAX_ACTIVE_TRACKS_PER_USER = 3;
export const CONFIRMATION_REQUIRED = 2;

export const BASE_INTERVALS: Record<'UNKNOWN' | 'NOT_AVAILABLE' | 'COMING_SOON' | 'AVAILABLE', number> = {
  UNKNOWN: 90,
  NOT_AVAILABLE: 90,
  COMING_SOON: 180,
  AVAILABLE: 60,
};

export const GLOBAL_CONCURRENCY_DEFAULT = 40;
export const PER_HOST_CONCURRENCY = 4;
export const PER_HOST_MIN_GAP_MS = 1000;
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
export const ACCEPT_LANGUAGE = 'en-GB,en;q=0.9';
