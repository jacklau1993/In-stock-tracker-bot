import { ProfileResult, SiteProfile } from '..';

interface NikeNextData {
  props?: {
    pageProps?: {
      initialState?: {
        Threads?: {
          products?: Array<{
            availableSkus?: Array<{ available?: boolean; nikeSize?: string }>;
            title?: string;
            currentPrice?: number;
          }>;
        };
      };
    };
  };
}

export const nikeProfile: SiteProfile = {
  hosts: ['nike.com'],
  parse(html: string): ProfileResult {
    const jsonMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/);
    if (!jsonMatch) return {};
    try {
      const data = JSON.parse(jsonMatch[1]) as NikeNextData;
      const product = data.props?.pageProps?.initialState?.Threads?.products?.[0];
      if (!product) return {};
      const sizes = product.availableSkus
        ?.filter((sku) => sku.available)
        ?.map((sku) => sku.nikeSize)
        ?.filter(Boolean);
      return {
        signals: {
          ctaEnabled: Boolean(sizes?.length),
          variantsAvailable: sizes ?? undefined,
          title: product.title,
          priceText: product.currentPrice?.toString(),
        },
        variantsSummary: sizes?.join(', '),
      };
    } catch {
      return {};
    }
  },
};
