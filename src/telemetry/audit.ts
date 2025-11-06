import { logger } from '../core/logging';

export function recordAudit(event: string, fields: Record<string, unknown>) {
  logger.info(`audit:${event}`, fields);
}
