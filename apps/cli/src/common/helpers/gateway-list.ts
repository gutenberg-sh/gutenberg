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
      throw new Error(
        `Gateway URL must use http(s): "${entry.trim()}"`,
      );
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

export type IrysNetwork = 'mainnet' | 'devnet';

export function irys_settlement_mirror(network: IrysNetwork): string {
  return network === 'devnet'
    ? 'https://devnet.irys.xyz'
    : 'https://gateway.irys.xyz';
}

export function compose_effective_gateways(
  user_mirrors: readonly string[],
  network: IrysNetwork,
): string[] {
  const settlement = irys_settlement_mirror(network);
  const combined = [...user_mirrors, settlement];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of combined) {
    const trimmed = entry.replace(/\/$/, '');

    if (seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}
