import { logger } from '../core/logging';

export function recordMetric(name: string, value = 1, tags?: Record<string, string | number>) {
  logger.debug('metric', { name, value, tags });
}
