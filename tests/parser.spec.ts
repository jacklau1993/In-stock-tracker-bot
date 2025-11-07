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
});
