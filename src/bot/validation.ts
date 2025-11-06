import { TelegramUpdate } from '../core/types';
import { ValidationError } from '../core/errors';

export function ensureMessage(update: TelegramUpdate): {
  chatId: number;
  userId: number;
  text?: string;
} {
  if (!update.message) throw new ValidationError('Unsupported update');
  const chatId = update.message.chat?.id;
  const userId = update.message.from?.id;
  if (!chatId || !userId) throw new ValidationError('Missing chat or user');
  return { chatId, userId, text: update.message.text };
}
