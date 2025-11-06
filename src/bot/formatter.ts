import { Track } from '../core/types';

export function formatStartMessage(): string {
  return [
    'Hello! Send me up to 3 product links (one per message) and I will check stock every minute.',
    'Commands: /help, /list, /remove <#|url>, /end',
  ].join('\n');
}

export function formatHelpMessage(): string {
  return [
    'Paste a product URL to start tracking.',
    'I will alert you once it is available (after double-confirming).',
    'Use /list to see tracked items, /remove <#|url> to stop, /end to clear all.',
  ].join('\n');
}

export function formatTrackingAck(order: number, host: string): string {
  return `Tracking #${order}: **${host}** - I will notify you when it is available.`;
}

export function formatList(tracks: Track[]): string {
  if (tracks.length === 0) return 'You have no active tracks. Send me a product URL to begin.';
  const rows = tracks.map((track, idx) => {
    const flags = track.needs_manual ? '⚠ manual' : '';
    const last = track.last_checked_at ?? '--';
    return `#${idx + 1} ${track.site_host} | ${track.status} | ${last} ${flags}`.trim();
  });
  return ['```', ...rows, '```'].join('\n');
}

export function formatRemoveConfirmation(host: string): string {
  return `Removed tracking for **${host}**.`;
}

export function formatEndConfirmation(count: number): string {
  if (count === 0) return 'You had no active tracks.';
  return `Removed ${count} track${count === 1 ? '' : 's'}.`;
}

export function formatAlert(track: Track): string {
  const lines = [
    `✅ In stock: **${track.title ?? track.site_host}** (${track.site_host})`,
  ];
  if (track.price) lines.push(track.price);
  if (track.variant_summary) lines.push(track.variant_summary);
  lines.push(track.url);
  lines.push('Removed from tracking. Send another link to track more.');
  return lines.join('\n');
}
