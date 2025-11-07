import { TrackRepository } from '../db/repos';
import { MAX_ACTIVE_TRACKS_PER_USER } from '../core/config';
import { normaliseUrl } from '../core/url';
import { formatAlert, formatEndConfirmation, formatHelpMessage, formatList, formatRemoveConfirmation, formatStartMessage, formatTrackingAck, formatVariantPrompt } from './formatter';
import { parseCommand } from './commands';
import { ensureMessage } from './validation';
import { Track, EnvBindings, TelegramUpdate, VariantOption } from '../core/types';
import { logger } from '../core/logging';
import { ValidationError } from '../core/errors';
import { recordAudit } from '../telemetry/audit';
import { recordMetric } from '../telemetry/metrics';
import { previewProduct } from './preview';

export interface HandlerDeps {
  repo: TrackRepository;
  env: EnvBindings;
}

export class BotHandler {
  constructor(private deps: HandlerDeps) {}

  async handle(update: TelegramUpdate): Promise<Response> {
    let chatId: number | null = null;
    let userId: number | null = null;
    let text: string | undefined;
    let command;

    try {
      ({ chatId, userId, text } = ensureMessage(update));
      command = await parseCommand(text);
      const tgId = String(userId);
      const userDbId = await this.deps.repo.upsertUser(tgId);
      switch (command.type) {
        case 'start':
          await sendTelegramMessage(this.deps.env, chatId, formatStartMessage());
          break;
        case 'help':
          await sendTelegramMessage(this.deps.env, chatId, formatHelpMessage());
          break;
        case 'list':
          await this.sendList(chatId, userDbId);
          break;
        case 'remove':
          await this.handleRemove(chatId, userDbId, command.argument!);
          break;
        case 'variant':
          await this.handleVariant(chatId, userDbId, command.argument!);
          break;
        case 'end':
          await this.handleEnd(chatId, userDbId);
          break;
        case 'track-url':
          if (!command.argument) throw new ValidationError('Missing URL');
          await this.handleTrack(chatId, userDbId, command.argument);
          break;
        default:
          await sendTelegramMessage(this.deps.env, chatId, 'Send me a product URL to begin.');
      }
      return new Response('ok', { status: 200 });
    } catch (err) {
      if (err instanceof ValidationError) {
        logger.warn('Validation error', { message: err.message });
        if (chatId !== null) {
          await sendTelegramMessage(this.deps.env, chatId, err.message);
        }
        return new Response('ignored', { status: 200 });
      }
      logger.error('Bot handler error', { error: (err as Error).message });
      return new Response('error', { status: 500 });
    }
  }

  private async sendList(chatId: number, userDbId: number) {
    const tracks = await this.deps.repo.getActiveTracksByUser(userDbId);
    await sendTelegramMessage(this.deps.env, chatId, formatList(tracks), 'Markdown');
  }

  private async handleTrack(chatId: number, userDbId: number, normalizedUrl: string) {
    const tracks = await this.deps.repo.getActiveTracksByUser(userDbId);
    if (tracks.length >= MAX_ACTIVE_TRACKS_PER_USER) {
      await sendTelegramMessage(this.deps.env, chatId, 'You already track 3 URLs. Remove one to add more.');
      return;
    }

    const { normalizedUrl: cleanUrl, siteHost, urlHash } = await normaliseUrl(normalizedUrl);
    const existing = await this.deps.repo.getTrackByUserAndHash(userDbId, urlHash);
    if (existing) {
      await sendTelegramMessage(this.deps.env, chatId, 'You already track this link.');
      return;
    }

    const preview = await previewProduct(cleanUrl).catch((err) => {
      logger.warn('Preview fetch failed', { error: (err as Error).message });
      return null;
    });

    const variantOptions = preview?.signals.variantOptions ?? [];
    const requiresSelection = variantOptions.length > 1;
    const autoSelect = variantOptions.length === 1 ? variantOptions[0] : null;
    const variantOptionsJson = variantOptions.length ? JSON.stringify(variantOptions) : null;
    const nextCheckAt = requiresSelection ? null : new Date().toISOString();

    const trackId = await this.deps.repo.insertTrack(userDbId, cleanUrl, siteHost, urlHash, nextCheckAt, {
      variantId: autoSelect?.id ?? null,
      variantLabel: autoSelect?.label ?? null,
      variantOptions: variantOptionsJson,
    });

    if (preview) {
      await this.deps.repo.updateAfterCheck(trackId, {
        title: preview.title ?? null,
        price: preview.price ?? null,
        variant_summary: autoSelect?.label ?? preview.variantsSummary ?? null,
        variant_options: variantOptionsJson,
      });
    }

    recordAudit('track_added', { userId: userDbId, url: cleanUrl });
    recordMetric('track_added');
    const updated = await this.deps.repo.getActiveTracksByUser(userDbId);
    const index = updated.findIndex((t) => t.id === trackId) + 1;

    if (requiresSelection) {
      await sendTelegramMessage(
        this.deps.env,
        chatId,
        formatVariantPrompt(index, siteHost, variantOptions),
        'Markdown'
      );
    } else {
      await sendTelegramMessage(this.deps.env, chatId, formatTrackingAck(index, siteHost), 'Markdown');
    }
  }

  private async handleRemove(chatId: number, userDbId: number, arg: string) {
    const tracks = await this.deps.repo.getActiveTracksByUser(userDbId);
    let target: Track | undefined;
    if (/^\d+$/.test(arg)) {
      const idx = Number(arg) - 1;
      target = tracks[idx];
    } else {
      const { urlHash } = await normaliseUrl(arg);
      target = tracks.find((t) => t.url_hash === urlHash);
    }

    if (!target) {
      await sendTelegramMessage(this.deps.env, chatId, 'Could not find that tracked URL.');
      return;
    }

    await this.deps.repo.deleteTrack(target.id);
    recordAudit('track_removed', { userId: userDbId, trackId: target.id });
    await sendTelegramMessage(this.deps.env, chatId, formatRemoveConfirmation(target.site_host), 'Markdown');
  }

  private async handleEnd(chatId: number, userDbId: number) {
    const removed = await this.deps.repo.deleteAllByUser(userDbId);
    recordAudit('track_end', { userId: userDbId, removed });
    await sendTelegramMessage(this.deps.env, chatId, formatEndConfirmation(removed));
  }

  private async handleVariant(chatId: number, userDbId: number, arg: string) {
    const parts = arg.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      await sendTelegramMessage(this.deps.env, chatId, 'Usage: /variant <option#> or /variant <#> <option#>');
      return;
    }

    const tracks = await this.deps.repo.getActiveTracksByUser(userDbId);
    const pending = tracks.filter((t) => !t.variant_id && t.variant_options);

    let trackIdx: number | undefined;
    let optionIdx: number | undefined;

    if (parts.length === 1) {
      optionIdx = Number(parts[0]) - 1;
      if (Number.isNaN(optionIdx)) {
        await sendTelegramMessage(this.deps.env, chatId, 'Usage: /variant <option#>');
        return;
      }
      if (pending.length === 0) {
        await sendTelegramMessage(this.deps.env, chatId, 'No pending variant selections.');
        return;
      }
      if (pending.length > 1) {
        await sendTelegramMessage(this.deps.env, chatId, 'Specify the item as `/variant <#> <option#>` since multiple tracks need selection.');
        return;
      }
      const target = pending[0];
      trackIdx = tracks.findIndex((t) => t.id === target.id);
    } else {
      trackIdx = Number(parts[0]) - 1;
      optionIdx = Number(parts[1]) - 1;
      if (Number.isNaN(trackIdx) || Number.isNaN(optionIdx)) {
        await sendTelegramMessage(this.deps.env, chatId, 'Usage: /variant <#> <option#>');
        return;
      }
    }

    const target = trackIdx !== undefined ? tracks[trackIdx] : undefined;
    if (!target) {
      await sendTelegramMessage(this.deps.env, chatId, 'Invalid track number.');
      return;
    }
    if (!target.variant_options) {
      await sendTelegramMessage(this.deps.env, chatId, 'This track has no selectable variants.');
      return;
    }

    if (optionIdx === undefined) {
      await sendTelegramMessage(this.deps.env, chatId, 'Invalid option number.');
      return;
    }

    const options: VariantOption[] = JSON.parse(target.variant_options);
    const option = options[optionIdx];
    if (!option) {
      await sendTelegramMessage(this.deps.env, chatId, 'Invalid variant option.');
      return;
    }

    await this.deps.repo.updateAfterCheck(target.id, {
      variant_id: option.id,
      variant_label: option.label,
      variant_summary: option.label,
      next_check_at: new Date().toISOString(),
    });

    await sendTelegramMessage(
      this.deps.env,
      chatId,
      `Tracking #${(trackIdx ?? tracks.findIndex((t) => t.id === target.id)) + 1}: now monitoring **${option.label}**`,
      'Markdown'
    );
  }
}

export async function sendTelegramMessage(
  env: EnvBindings,
  chatId: number,
  text: string,
  parseMode?: 'MarkdownV2' | 'Markdown' | 'HTML'
) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
  if (!res.ok) {
    const body = await res.text();
    logger.error('Telegram send failed', { status: res.status, body });
    throw new Error('Failed to send Telegram message');
  }
}
