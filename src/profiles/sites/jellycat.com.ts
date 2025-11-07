import { ProfileResult, SiteProfile } from '..';

type VariantLabelMap = Map<number, string>;

interface BCProductAttributes {
  available_variant_values?: number[];
  in_stock_attributes?: number[];
  price?: {
    with_tax?: {
      formatted?: string;
    };
  };
}

interface BCDataShape {
  product_attributes?: BCProductAttributes;
}

export const jellycatProfile: SiteProfile = {
  hosts: ['jellycat.com'],
  parse(html: string): ProfileResult {
    const bc = extractBCData(html);
    const labels = extractVariantLabels(html);
    if ((!bc || !bc.product_attributes) && labels.size === 0) return {};

    const availableIds = new Set<number>([...(bc?.product_attributes?.available_variant_values ?? [])]);
    (bc?.product_attributes?.in_stock_attributes ?? []).forEach((id) => availableIds.add(id));

    const variantOptions = Array.from(labels.entries()).map(([id, label]) => ({
      id: String(id),
      label,
      available: availableIds.has(id),
    }));

    const availableNames = variantOptions.filter((opt) => opt.available).map((opt) => opt.label);

    return {
      statusHint: availableNames.length ? 'AVAILABLE' : undefined,
      variantsSummary: availableNames.length ? availableNames.join(', ') : undefined,
      price: bc?.product_attributes?.price?.with_tax?.formatted,
      signals: {
        variantsAvailable: availableNames,
        variantOptions,
      },
      variantOptions,
    };
  },
};

function extractBCData(html: string): BCDataShape | null {
  const match = html.match(/var BCData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as BCDataShape;
  } catch {
    return null;
  }
}

function extractVariantLabels(html: string): VariantLabelMap {
  const map: VariantLabelMap = new Map();
  const regex = /\{"id":(\d+),"label":"([^"]+)","selected":(?:true|false),"data":"[^"]*"\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    map.set(Number(match[1]), match[2]);
  }
  return map;
}
