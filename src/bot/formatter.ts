import { Track, VariantOption } from '../core/types';

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

export function formatVariantPrompt(order: number, host: string, options: VariantOption[]): string {
  const lines = [
    `Tracking #${order}: **${host}** has multiple options.`,
    'Pick one with `/variant <option#>` (use `/variant <#> <option#>` only when several items are pending):',
  ];
  options.forEach((option, idx) => {
    lines.push(`Option ${idx + 1}: ${option.label} - ${option.available ? 'Available' : 'Not available'}`);
  });
  lines.push('Example: `/variant 2` selects option 2 for this item.');
  return lines.join('\n');
}

export function formatList(tracks: Track[]): string {
  if (tracks.length === 0) return 'You have no active tracks. Send me a product URL to begin.';
  const rows = tracks.map((track, idx) => {
    const flags = track.needs_manual ? '⚠ manual' : '';
    const last = track.last_checked_at ?? '--';
    const variantNote = track.variant_label
      ? ` [${track.variant_label}]`
      : track.variant_options
        ? ' [select variant]'
        : '';
    return `#${idx + 1} ${track.site_host}${variantNote} | ${track.status} | ${last} ${flags}`.trim();
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
  if (track.variant_label) lines.push(`Variant: ${track.variant_label}`);
  if (track.price) lines.push(track.price);
  if (track.variant_summary) lines.push(track.variant_summary);
  lines.push(track.url);
  lines.push('Removed from tracking. Send another link to track more.');
  return lines.join('\n');
}
