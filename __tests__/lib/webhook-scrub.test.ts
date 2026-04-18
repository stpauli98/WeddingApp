import { scrubPayload } from '@/lib/webhook-scrub';

describe('scrubPayload', () => {
  it('removes customer_name and billing_address', () => {
    const raw = {
      meta: { event_name: 'order_created', custom_data: { eventId: 'e1' } },
      data: {
        attributes: {
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          total: 3999,
          billing_address: { city: 'Sarajevo', country: 'BA' },
          user_email: 'john@example.com',
        },
      },
    };
    const scrubbed = scrubPayload(raw) as any;
    expect(scrubbed.data.attributes.customer_name).toBeUndefined();
    expect(scrubbed.data.attributes.billing_address).toBeUndefined();
    expect(scrubbed.data.attributes.customer_email).toBe('john@example.com');
    expect(scrubbed.data.attributes.total).toBe(3999);
    expect(scrubbed.meta.event_name).toBe('order_created');
  });

  it('handles missing fields gracefully', () => {
    expect(scrubPayload({})).toEqual({});
    expect(scrubPayload({ data: {} })).toEqual({ data: {} });
  });

  it('does not mutate input', () => {
    const raw = { data: { attributes: { customer_name: 'X' } } };
    const copy = JSON.parse(JSON.stringify(raw));
    scrubPayload(raw);
    expect(raw).toEqual(copy);
  });

  it('passes primitives through unchanged', () => {
    expect(scrubPayload(null)).toBeNull();
    expect(scrubPayload('string' as any)).toBe('string');
    expect(scrubPayload(42 as any)).toBe(42);
  });
});
