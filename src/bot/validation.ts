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

export function ensureCallbackQuery(update: TelegramUpdate): {
  callbackQueryId: string;
  chatId: number;
  userId: number;
  data: string;
  messageId: number;
} {
  if (!update.callback_query) throw new ValidationError('Unsupported update');
  const callbackQueryId = update.callback_query.id;
  const chatId = update.callback_query.message?.chat?.id;
  const userId = update.callback_query.from?.id;
  const data = update.callback_query.data;
  const messageId = update.callback_query.message?.message_id;
  if (!callbackQueryId || !chatId || !userId || !data || !messageId) {
    throw new ValidationError('Malformed callback query');
  }
  return { callbackQueryId, chatId, userId, data, messageId };
}
