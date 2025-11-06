import { ProfileResult, SiteProfile } from '..';

export const amazonUkProfile: SiteProfile = {
  hosts: ['amazon.co.uk'],
  parse(html: string): ProfileResult {
    const availabilityMatch = html.match(/id="availability"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
    const priceMatch = html.match(/id="priceblock_ourprice"[^>]*>([^<]+)</i);
    const titleMatch = html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/i);
    const availabilityText = availabilityMatch ? availabilityMatch[1].trim() : undefined;
    const statusHint = availabilityText?.toLowerCase().includes('in stock') ? 'AVAILABLE' : undefined;
    return {
      statusHint,
      price: priceMatch ? priceMatch[1].trim() : undefined,
      title: titleMatch ? titleMatch[1].trim() : undefined,
      signals: availabilityText
        ? {
            ctaTexts: [availabilityText],
            ctaEnabled: statusHint === 'AVAILABLE',
          }
        : undefined,
    };
  },
};
