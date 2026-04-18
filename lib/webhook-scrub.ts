const STRIPPED_FIELDS = ['customer_name', 'billing_address'] as const;

/**
 * GDPR minimization — strips PII from webhook payload before DB insert.
 * Keeps: email (refund audit), total, event_id, order_id, tier info.
 * Removes: customer_name, billing_address.
 */
export function scrubPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = JSON.parse(JSON.stringify(payload));
  const attrs = clone?.data?.attributes;
  if (attrs && typeof attrs === 'object') {
    for (const field of STRIPPED_FIELDS) {
      delete attrs[field];
    }
  }
  return clone;
}
