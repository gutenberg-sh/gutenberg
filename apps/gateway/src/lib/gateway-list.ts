export function parse_gateway_list(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim().replace(/\/$/, '');

    if (trimmed.length === 0) {
      continue;
    }

    let parsed: URL;

    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error(`Invalid gateway URL "${entry.trim()}"`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Gateway URL must use http(s): "${entry.trim()}"`);
    }

    if (seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    out.push(trimmed);
  }

  if (out.length === 0) {
    throw new Error(
      'Gateway list is empty. Provide at least one https://… gateway.',
    );
  }

  return out;
}

export function gateway_host(gateway: string): string {
  try {
    return new URL(gateway).host;
  } catch {
    return gateway;
  }
}
