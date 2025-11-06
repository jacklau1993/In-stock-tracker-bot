import {
  GLOBAL_CONCURRENCY_DEFAULT,
  PER_HOST_CONCURRENCY,
  PER_HOST_MIN_GAP_MS,
} from '../core/config';
import { D1Client } from '../db/d1';
import { TrackRepository } from '../db/repos';
import { EnvBindings, Track } from '../core/types';
import { RateLimiter } from './rateLimiter';
import { fetchTrack } from './fetcher';
import { parsePage } from './parser';
import { normalise } from './normaliser';
import { applyTransition } from './transitions';
import { hashContentSnippet } from '../core/signatures';
import { formatAlert } from '../bot/formatter';
import { sendTelegramMessage } from '../bot/handlers';
import { logger } from '../core/logging';
import { FetchError } from '../core/errors';
import { recordMetric } from '../telemetry/metrics';
import { recordAudit } from '../telemetry/audit';

export async function handleCron(env: EnvBindings): Promise<Response> {
  const repo = new TrackRepository(new D1Client(env.D1_DB));
  const now = new Date();
  const due = await repo.getDueTracks(now.toISOString(), 200);
  if (due.length === 0) {
    return new Response('no-due');
  }

  const limiter = new RateLimiter({
    perHost: PER_HOST_CONCURRENCY,
    global: Number(env.MAX_GLOBAL_CONCURRENCY ?? GLOBAL_CONCURRENCY_DEFAULT),
    minGapMs: PER_HOST_MIN_GAP_MS,
  });

  await Promise.all(due.map((track) => limiter.schedule(track.site_host, () => processTrack(track, repo, env))));

  return new Response('ok');
}

type DueTrack = Track & { tg_user_id: string };

async function processTrack(track: DueTrack, repo: TrackRepository, env: EnvBindings) {
  const now = new Date();
  try {
    const outcome = await fetchTrack(track, env);
    if (outcome.status === 'not-modified') {
      const decision = applyTransition({
        track,
        observedStatus: track.status,
        now,
        success: true,
        needsManual: track.needs_manual === 1,
      });
      await repo.updateAfterCheck(track.id, decision.patch);
      return;
    }

    if (!outcome.html) throw new Error('Missing HTML in fetch');
    const parsed = parsePage(outcome.html, track.site_host, outcome.headers);
    const normalized = normalise(parsed);
    const needsManual = detectManualBlock(outcome.html);
    const decision = applyTransition({
      track,
      observedStatus: normalized.status,
      now,
      success: true,
      needsManual,
    });

    const patch = {
      ...decision.patch,
      title: normalized.title ?? track.title,
      price: normalized.price ?? track.price,
      variant_summary: normalized.variantsSummary ?? track.variant_summary,
      etag: outcome.headers.get('etag') ?? track.etag,
      content_sig: await hashContentSnippet(outcome.html),
    };

    if (decision.alert) {
      const chatId = Number(track.tg_user_id);
      await sendTelegramMessage(env, chatId, formatAlert({ ...track, ...patch } as Track), 'Markdown');
      recordAudit('alert_sent', { trackId: track.id, userId: track.user_id });
      recordMetric('alert_sent');
      await repo.deleteTrack(track.id);
    } else {
      await repo.updateAfterCheck(track.id, patch);
    }
  } catch (err) {
    logger.warn('Track processing failed', { id: track.id, error: (err as Error).message });
    const needsManual = err instanceof FetchError && (err.status === 403 || err.status === 429);
    const decision = applyTransition({
      track,
      observedStatus: track.status,
      now,
      success: false,
      needsManual,
    });
    await repo.updateAfterCheck(track.id, decision.patch);
  }
}

function detectManualBlock(html: string): boolean {
  return /captcha|enable javascript|region restriction/i.test(html);
}
