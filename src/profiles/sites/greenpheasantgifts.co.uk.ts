import { ProfileResult, SiteProfile } from '..';
import { Status } from '../../core/types';

type JSONObject = Record<string, unknown>;

interface SchemaFields {
  availability?: string;
  price?: string;
  title?: string;
}

export const greenPheasantProfile: SiteProfile = {
  hosts: ['greenpheasantgifts.co.uk'],
  parse(html: string): ProfileResult {
    const stockStatus = detectStockStatus(html);
    const schema = extractSchemaFields(html);
    const schemaStatus = mapSchemaAvailability(schema.availability);
    const status = stockStatus ?? schemaStatus;

    if (!status) return {};

    return {
      statusHint: status,
      title: schema.title,
      price: schema.price,
      signals: buildSignals(status),
    };
  },
};

function detectStockStatus(html: string): Status | undefined {
  if (/\bclass=["'][^"']*\bstock\b[^"']*\bin-stock\b[^"']*["']/i.test(html)) {
    return 'AVAILABLE';
  }
  if (/\bclass=["'][^"']*\bstock\b[^"']*\bout-of-stock\b[^"']*["']/i.test(html)) {
    return 'NOT_AVAILABLE';
  }
  if (/\bclass=["'][^"']*\bstock\b[^"']*\bonbackorder\b[^"']*["']/i.test(html)) {
    return 'AVAILABLE';
  }
  return undefined;
}

function mapSchemaAvailability(value?: string): Status | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower.includes('instock')) return 'AVAILABLE';
  if (lower.includes('outofstock')) return 'NOT_AVAILABLE';
  if (lower.includes('preorder') || lower.includes('presale')) return 'COMING_SOON';
  return undefined;
}

function buildSignals(status: Status): ProfileResult['signals'] {
  if (status === 'AVAILABLE') {
    return {
      ctaEnabled: true,
      ctaTexts: ['add to basket'],
      oosTexts: [],
      soonTexts: [],
      inStockFlag: true,
    };
  }
  if (status === 'NOT_AVAILABLE') {
    return {
      ctaEnabled: false,
      ctaTexts: [],
      oosTexts: ['out of stock'],
      soonTexts: [],
      inStockFlag: false,
    };
  }
  return {
    ctaEnabled: false,
    ctaTexts: [],
    oosTexts: [],
    soonTexts: ['coming soon'],
  };
}

function extractSchemaFields(html: string): SchemaFields {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const body = match[1].trim();
    if (!body) continue;
    try {
      const data = JSON.parse(body) as unknown;
      const objects = collectObjects(data);
      const product = objects.find(isProductObject);
      if (!product) continue;
      return {
        availability: extractAvailability(product),
        price: extractPrice(product),
        title: asNonEmptyString(product.name),
      };
    } catch {
      continue;
    }
  }
  return {};
}

function collectObjects(input: unknown): JSONObject[] {
  const out: JSONObject[] = [];
  const stack: unknown[] = [input];

  while (stack.length > 0) {
    const next = stack.pop();
    if (Array.isArray(next)) {
      stack.push(...next);
      continue;
    }
    if (!next || typeof next !== 'object') continue;
    const obj = next as JSONObject;
    out.push(obj);
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return out;
}

function isProductObject(input: JSONObject): boolean {
  const type = input['@type'];
  if (typeof type === 'string') return type.toLowerCase() === 'product';
  if (Array.isArray(type)) {
    return type.some((value) => typeof value === 'string' && value.toLowerCase() === 'product');
  }
  return false;
}

function extractAvailability(product: JSONObject): string | undefined {
  const offers = toObjectArray(product.offers);
  for (const offer of offers) {
    const availability = asNonEmptyString(offer.availability);
    if (availability) return availability;
  }
  return asNonEmptyString(product.availability);
}

function extractPrice(product: JSONObject): string | undefined {
  const offers = toObjectArray(product.offers);
  for (const offer of offers) {
    const direct = asPriceString(offer.price);
    if (direct) return direct;
    const specification = offer.priceSpecification;
    if (specification && typeof specification === 'object') {
      const fromSpec = asPriceString((specification as JSONObject).price);
      if (fromSpec) return fromSpec;
    }
  }

  return asPriceString(product.price);
}

function toObjectArray(value: unknown): JSONObject[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is JSONObject => Boolean(item) && typeof item === 'object');
  }
  if (typeof value === 'object') return [value as JSONObject];
  return [];
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function asPriceString(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return asNonEmptyString(value);
}
