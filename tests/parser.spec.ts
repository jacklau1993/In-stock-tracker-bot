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
});
