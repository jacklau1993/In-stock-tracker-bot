import { ProfileResult, SiteProfile } from '..';

interface ProviderData {
  items?: Record<string, ProviderItem>;
}

interface ProviderItem {
  name?: string;
  is_salable?: string;
  is_available?: boolean;
  price_info?: {
    formatted_prices?: {
      final_price?: string;
    };
    final_price?: number;
  };
}

export const noodollProfile: SiteProfile = {
  hosts: ['noodoll.com'],
  parse(html: string): ProfileResult {
    const data = extractProviderData(html);
    if (!data?.items) return {};

    const first = Object.values(data.items)[0];
    if (!first) return {};

    const available = first.is_available === true || first.is_salable === '1';
    const price = stripTags(first.price_info?.formatted_prices?.final_price) ??
      (typeof first.price_info?.final_price === 'number'
        ? `£${first.price_info!.final_price.toFixed(2)}`
        : undefined);

    return {
      statusHint: available ? 'AVAILABLE' : 'NOT_AVAILABLE',
      price,
      title: first.name,
    };
  },
};

function extractProviderData(html: string): ProviderData | null {
  const scriptRegex = /<script[^>]+type=["']text\/x-magento-init["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const body = match[1].trim();
    if (!body) continue;
    try {
      const json = JSON.parse(body) as Record<string, unknown>;
      const root = json['*'] as Record<string, unknown> | undefined;
      const provider = root?.['Magento_Catalog/js/product/view/provider'] as { data?: ProviderData } | undefined;
      if (provider?.data) {
        return provider.data;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function stripTags(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]+>/g, '').trim();
}
