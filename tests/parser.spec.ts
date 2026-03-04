import { describe, it, expect } from 'vitest';
import { parsePage } from '../src/checker/parser';

const headers = new Headers();

describe('parser', () => {
  it('marks CTA enabled pages as AVAILABLE', () => {
    const html = '<button>Add to Basket</button>';
    const result = parsePage(html, 'example.com', headers);
    expect(result.status).toBe('AVAILABLE');
  });

  it('marks out of stock copy', () => {
    const html = '<div>Currently unavailable</div>';
    const result = parsePage(html, 'example.com', headers);
    expect(result.status).toBe('NOT_AVAILABLE');
  });

  it('marks coming soon copy', () => {
    const html = '<div>Coming Soon</div>';
    const result = parsePage(html, 'example.com', headers);
    expect(result.status).toBe('COMING_SOON');
  });

  it('uses jellycat profile to detect variant availability', () => {
    const html = `
      <script type="text/javascript">var BCData = {"product_attributes":{"available_variant_values":[2],"in_stock_attributes":[],"price":{"with_tax":{"formatted":"£60.00"}}}};</script>
      <script type="text/javascript" id="swym-js-page-context">
        var swymproduct = {
          options: (true == true ? [{"id":1484,"values":[{"id":1,"label":"Large","selected":true,"data":"Large"},{"id":2,"label":"Huge","selected":false,"data":"Huge"}]}] : [])
        };
      </script>
    `;
    const result = parsePage(html, 'jellycat.com', headers);
    expect(result.status).toBe('AVAILABLE');
    expect(result.variantsSummary).toContain('Huge');
  });

  it('uses noodoll profile to map availability', () => {
    const html = `
      <script type="text/x-magento-init">
        {"*":{"Magento_Catalog/js/product/view/provider":{"data":{"items":{"1532":{"name":"Professor","is_salable":"0","price_info":{"formatted_prices":{"final_price":"£22.50"}}}}}}}}
      </script>
    `;
    const result = parsePage(html, 'noodoll.com', headers);
    expect(result.status).toBe('NOT_AVAILABLE');
    expect(result.price).toBe('£22.50');
  });

  it('uses greenpheasant profile to prioritize in-stock class over noisy text', () => {
    const html = `
      <p class="stock in-stock">In stock</p>
      <div>Out of stock in other colours</div>
    `;
    const result = parsePage(html, 'greenpheasantgifts.co.uk', headers);
    expect(result.status).toBe('AVAILABLE');
  });

  it('uses greenpheasant profile to map out-of-stock class', () => {
    const html = `
      <p class="stock out-of-stock">Out of stock</p>
      <button>Add to basket</button>
    `;
    const result = parsePage(html, 'greenpheasantgifts.co.uk', headers);
    expect(result.status).toBe('NOT_AVAILABLE');
  });

  it('uses greenpheasant schema availability fallback and extracts title/price', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Green Pheasant Test Product",
          "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/InStock",
            "price": "29.99"
          }
        }
      </script>
    `;
    const result = parsePage(html, 'greenpheasantgifts.co.uk', headers);
    expect(result.status).toBe('AVAILABLE');
    expect(result.title).toBe('Green Pheasant Test Product');
    expect(result.price).toBe('29.99');
  });

  it('does not apply greenpheasant class-based parsing on other hosts', () => {
    const html = '<p class="stock in-stock">In stock</p>';
    const result = parsePage(html, 'example.com', headers);
    expect(result.status).toBe('UNKNOWN');
  });
});
