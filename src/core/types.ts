export type Status =
  | 'UNKNOWN'
  | 'NOT_AVAILABLE'
  | 'COMING_SOON'
  | 'AVAILABLE'
  | 'ERROR';

export interface User {
  id: number;
  tg_user_id: string;
  created_at: string;
}

export interface Track {
  id: number;
  user_id: number;
  url: string;
  url_hash: string;
  site_host: string;
  title?: string | null;
  price?: string | null;
  variant_summary?: string | null;
  variant_id?: string | null;
  variant_label?: string | null;
  variant_options?: string | null;
  status: Status;
  status_conf_count: number;
  fail_count: number;
  backoff_sec: number;
  needs_manual: number;
  etag?: string | null;
  content_sig?: string | null;
  created_at: string;
  last_checked_at?: string | null;
  next_check_at?: string | null;
}

export interface ScrapeSignals {
  ctaTexts: string[];
  ctaEnabled: boolean;
  oosTexts: string[];
  soonTexts: string[];
  schemaAvailability?: string;
  inStockFlag?: boolean;
  variantsAvailable?: string[];
  variantOptions?: VariantOption[];
  title?: string;
  priceText?: string;
}

export interface ScrapeResult {
  status: Status;
  variantsSummary?: string;
  price?: string;
  title?: string;
  signals: ScrapeSignals;
}

export interface VariantOption {
  id: string;
  label: string;
  available: boolean;
}

export interface EnvBindings {
  D1_DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  LOG_LEVEL?: string;
  MAX_GLOBAL_CONCURRENCY?: string;
  REQUEST_TIMEOUT_MS?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot?: boolean;
      first_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
    };
    date: number;
    text?: string;
    entities?: Array<{
      offset: number;
      length: number;
      type: string;
    }>;
  };
}

export type TrackUpdatePatch = Partial<
  Pick<
    Track,
    | 'status'
    | 'status_conf_count'
    | 'fail_count'
    | 'backoff_sec'
    | 'needs_manual'
    | 'etag'
    | 'content_sig'
    | 'title'
    | 'price'
    | 'variant_summary'
    | 'variant_id'
    | 'variant_label'
    | 'variant_options'
    | 'last_checked_at'
    | 'next_check_at'
  >
>;

export interface RateLimiterTicket {
  host: string;
  trackId: number;
}
