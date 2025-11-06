import { BotHandler } from './handlers';
import { TrackRepository } from '../db/repos';
import { D1Client } from '../db/d1';
import { EnvBindings, TelegramUpdate } from '../core/types';

export async function handleTelegramWebhook(request: Request, env: EnvBindings): Promise<Response> {
  const payload = (await request.json().catch(() => ({}))) as TelegramUpdate;
  const repo = new TrackRepository(new D1Client(env.D1_DB));
  const handler = new BotHandler({ repo, env });
  return handler.handle(payload);
}
