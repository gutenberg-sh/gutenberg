import {
  build_unsigned_manifest,
  canonical_json,
  fetch_minimum_balance_for_rent_exemption,
  fetch_name_authority,
  find_name_address,
  NAME_ACCOUNT_SPACE,
  PUBLISH_BASE_FEE_LAMPORTS,
  RELEASE_ACCOUNT_SPACE,
  type GutenbergManifestFile,
  type PublishSessionInput,
} from '@gutenberg/core';

export const LAMPORTS_PER_SOL = 1_000_000_000;

export type SolanaCostEstimate = {
  base_fee_lamports: number;
  release_rent_lamports: number;
  name_rent_lamports: number;
  creates_name: boolean;
  total_lamports: number;
};

export type IrysCostEstimate = {
  bytes: number;
  manifest_bytes: number;
  files_bytes: number;
  price_atomic: string;
  ticker: string;
};

export async function estimate_solana_publish_cost(input: {
  rpc_url: string;
  name: string;
  program_id?: string;
}): Promise<SolanaCostEstimate> {
  const { address } = find_name_address({
    name: input.name,
    ...(input.program_id ? { program_id: input.program_id } : {}),
  });
  const authority = await fetch_name_authority({
    rpc_url: input.rpc_url,
    name: input.name,
    address,
  });
  const creates_name = authority === undefined;

  const release_rent = await fetch_minimum_balance_for_rent_exemption({
    rpc_url: input.rpc_url,
    data_length: RELEASE_ACCOUNT_SPACE,
  });
  const name_rent = creates_name
    ? await fetch_minimum_balance_for_rent_exemption({
        rpc_url: input.rpc_url,
        data_length: NAME_ACCOUNT_SPACE,
      })
    : 0;

  return {
    base_fee_lamports: PUBLISH_BASE_FEE_LAMPORTS,
    release_rent_lamports: release_rent,
    name_rent_lamports: name_rent,
    creates_name,
    total_lamports: release_rent + name_rent + PUBLISH_BASE_FEE_LAMPORTS,
  };
}

export function estimate_manifest_size_for_session(
  session: PublishSessionInput,
): number {
  const sample_files: Record<`/${string}`, GutenbergManifestFile> = {};

  for (const f of session.files) {
    sample_files[f.path] = {
      hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      size_bytes: f.size_bytes,
      uri: 'ar://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ...(f.mime ? { mime: f.mime } : {}),
    };
  }

  const sample = build_unsigned_manifest({
    name: session.name,
    version: session.version,
    publisher: '11111111111111111111111111111111',
    entry: session.entry,
    files: sample_files,
    chain: session.chain,
    ...(session.prev_version ? { prev_version: session.prev_version } : {}),
    ...(session.license ? { license: session.license } : {}),
    ...(session.language ? { language: session.language } : {}),
  });

  const text = canonical_json({
    ...sample,
    signature:
      'ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  });

  return new TextEncoder().encode(text).byteLength;
}

export async function estimate_irys_publish_cost(input: {
  bundler_url: string;
  session: PublishSessionInput;
}): Promise<IrysCostEstimate> {
  const files_bytes = input.session.files.reduce(
    (acc, f) => acc + f.size_bytes,
    0,
  );
  const manifest_bytes = estimate_manifest_size_for_session(input.session);
  const total = files_bytes + manifest_bytes;

  const url = `${input.bundler_url.replace(/\/$/, '')}/price/solana/${total}`;
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(
      `Irys price endpoint ${url} returned ${response.status} ${response.statusText}`,
    );
  }

  const text = (await response.text()).trim();
  const parsed = parse_atomic_price(text);

  if (parsed === undefined) {
    throw new Error(`Irys price endpoint returned unexpected payload: ${text}`);
  }

  return {
    bytes: total,
    files_bytes,
    manifest_bytes,
    price_atomic: parsed,
    ticker: 'SOL',
  };
}

function parse_atomic_price(value: string): string | undefined {
  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return Math.round(parsed).toString();
    }

    if (typeof parsed === 'string' && /^\d+$/.test(parsed)) {
      return parsed;
    }
  } catch {
    // fall through
  }

  return undefined;
}

export function format_lamports_as_sol(lamports: bigint | number): string {
  const value = typeof lamports === 'bigint' ? lamports : BigInt(lamports);
  const whole = value / BigInt(LAMPORTS_PER_SOL);
  const frac = value % BigInt(LAMPORTS_PER_SOL);

  return `${whole.toString()}.${frac.toString().padStart(9, '0')}`;
}
