/**
 * Canonical JSON: stable key-sorted, no insignificant whitespace.
 * Must match the CLI's manifest-service implementation byte-for-byte; this is
 * the input the publisher signs and that we re-hash to verify the registry
 * release event.
 */
export function canonical_json(value: unknown): string {
  return JSON.stringify(to_canonical_value(value));
}

function to_canonical_value(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(to_canonical_value);
  }

  if (is_plain_object(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, to_canonical_value(child)]),
    );
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Canonical JSON does not support non-finite numbers');
  }

  if (typeof value === 'undefined') {
    throw new Error('Canonical JSON does not support undefined');
  }

  return value;
}

function is_plain_object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
