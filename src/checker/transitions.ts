import { BASE_INTERVALS, CONFIRMATION_REQUIRED } from '../core/config';
import { Track, Status } from '../core/types';
import { TrackUpdatePatch } from '../core/types';

export interface TransitionDecision {
  patch: TrackUpdatePatch;
  alert: boolean;
}

export interface TransitionInput {
  track: Track;
  observedStatus: Status;
  now: Date;
  success: boolean;
  needsManual: boolean;
}

export function applyTransition(input: TransitionInput): TransitionDecision {
  if (!input.success) {
    return handleErrorTransition(input);
  }
  return handleSuccessTransition(input);
}

function handleErrorTransition({ track, now, needsManual }: TransitionInput): TransitionDecision {
  const failCount = track.fail_count + 1;
  const backoff = Math.min(60 * 2 ** (failCount - 1), 3600);
  const nextCheck = new Date(now.getTime() + backoff * 1000).toISOString();
  const patch: TrackUpdatePatch = {
    status: 'ERROR',
    fail_count: failCount,
    backoff_sec: backoff,
    status_conf_count: 0,
    next_check_at: nextCheck,
    last_checked_at: now.toISOString(),
    needs_manual: needsManual ? 1 : 0,
  };
  return { patch, alert: false };
}

function handleSuccessTransition({ track, observedStatus, now, needsManual }: TransitionInput): TransitionDecision {
  const { nextStatus, nextConf, alert } = computeStatusTransition(
    track.status,
    observedStatus,
    track.status_conf_count
  );
  const interval = BASE_INTERVALS[nextStatus] ?? 90;
  const nextCheck = new Date(now.getTime() + interval * 1000).toISOString();
  const patch: TrackUpdatePatch = {
    status: nextStatus,
    status_conf_count: nextConf,
    fail_count: 0,
    backoff_sec: interval,
    next_check_at: nextCheck,
    last_checked_at: now.toISOString(),
    needs_manual: needsManual ? 1 : 0,
  };
  return { patch, alert };
}

function computeStatusTransition(
  prev: Status,
  next: Status,
  conf: number
): { nextStatus: Status; nextConf: number; alert: boolean } {
  let nextConf = conf;
  let alert = false;
  let nextStatus = next;

  if (next === 'AVAILABLE') {
    if (prev === 'AVAILABLE') {
      nextConf += 1;
      alert = false;
    } else {
      nextConf = conf + 1;
      nextStatus = 'AVAILABLE';
    }
    if (nextConf >= CONFIRMATION_REQUIRED) {
      alert = prev !== 'AVAILABLE' || nextConf === CONFIRMATION_REQUIRED;
    }
    return { nextStatus, nextConf, alert };
  }

  if (next === 'NOT_AVAILABLE') {
    nextStatus = 'NOT_AVAILABLE';
    nextConf = prev === 'NOT_AVAILABLE' ? conf + 1 : 1;
    return { nextStatus, nextConf, alert: false };
  }

  if (next === 'COMING_SOON') {
    nextStatus = 'COMING_SOON';
    nextConf = prev === 'COMING_SOON' ? conf + 1 : 1;
    return { nextStatus, nextConf, alert: false };
  }

  if (next === 'UNKNOWN') {
    nextStatus = 'UNKNOWN';
    nextConf = prev === 'UNKNOWN' ? conf + 1 : 1;
    return { nextStatus, nextConf, alert: false };
  }

  return { nextStatus, nextConf: 0, alert: false };
}
