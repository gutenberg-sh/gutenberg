import { Inject, Injectable } from '@nestjs/common';

import {
  GATEWAY_URL,
  IRYS_GATEWAY_URL,
  IRYS_NETWORK,
  SOLANA_RPC_URL,
} from '../../common/config/config.tokens';
import {
  parse_gateway_list,
  type IrysNetwork,
} from '../../common/helpers/gateway-list';
import { SolanaRegistryRepository } from '../registry/solana-registry.repository';

import type { DoctorCheck, DoctorResult } from './doctor.types';

const GATEWAY_PROBE_TIMEOUT_MS = 5_000;

@Injectable()
export class DoctorService {
  constructor(
    private readonly registry_repository: SolanaRegistryRepository,
    @Inject(IRYS_GATEWAY_URL) private readonly irys_gateway: string,
    @Inject(IRYS_NETWORK)
    private readonly irys_network: IrysNetwork,
    @Inject(SOLANA_RPC_URL) private readonly solana_rpc_url: string,
    @Inject(GATEWAY_URL) private readonly gateway_url: string,
  ) {}

  async check(): Promise<DoctorResult> {
    const checks: DoctorCheck[] = [
      this.check_canonical_gateway(),
      this.check_browser_canonical_alignment(),
      this.check_browser_mirrors_alignment(),
      await this.check_solana_rpc(),
      this.check_registry_program_id(),
      await this.check_gateway_reachable(),
      await this.check_irys_bundler(),
    ];

    return {
      ok: checks.every((check) => check.status !== 'error'),
      checks,
    };
  }

  private check_canonical_gateway(): DoctorCheck {
    return ok_check(
      'canonical_gateway',
      `Canonical Irys gateway (${this.irys_network}): ${safe_host(this.irys_gateway)}`,
    );
  }

  private check_browser_canonical_alignment(): DoctorCheck {
    const raw = process.env.VITE_GUTENBERG_IRYS_GATEWAY;

    if (!raw || raw.trim().length === 0) {
      return error_check_message(
        'browser_canonical_alignment',
        'VITE_GUTENBERG_IRYS_GATEWAY is not set; the browser gateway will refuse to start. Set it to the same canonical Irys URL as the CLI.',
      );
    }

    const browser_canonical = raw.trim().replace(/\/$/, '');
    const cli_canonical = this.irys_gateway.replace(/\/$/, '');

    if (browser_canonical !== cli_canonical) {
      return warn_check(
        'browser_canonical_alignment',
        `Browser canonical (${safe_host(browser_canonical)}) does not match CLI canonical (${safe_host(cli_canonical)}). Newly published content will be unreachable in the browser until propagation.`,
      );
    }

    return ok_check(
      'browser_canonical_alignment',
      `Browser canonical Irys gateway matches CLI: ${safe_host(cli_canonical)}`,
    );
  }

  private check_browser_mirrors_alignment(): DoctorCheck {
    const raw = process.env.VITE_GUTENBERG_ARWEAVE_MIRRORS;

    if (!raw || raw.trim().length === 0) {
      return warn_check(
        'browser_mirrors_alignment',
        'VITE_GUTENBERG_ARWEAVE_MIRRORS is not set; the browser will only resolve via the canonical Irys gateway. Configure mirrors so readers can route around Irys when it is unreachable.',
      );
    }

    let mirrors: string[];

    try {
      mirrors = parse_gateway_list(raw);
    } catch (error) {
      return error_check('browser_mirrors_alignment', error);
    }

    return ok_check(
      'browser_mirrors_alignment',
      `Browser configured with ${mirrors.length} mirror(s): ${mirrors.map(safe_host).join(', ')}`,
    );
  }

  private async check_solana_rpc(): Promise<DoctorCheck> {
    try {
      const version = await this.registry_repository.check_rpc_connection();

      return ok_check(
        'solana_rpc',
        `Connected to ${this.solana_rpc_url} (solana-core ${version})`,
      );
    } catch (error) {
      return error_check('solana_rpc', error);
    }
  }

  private check_registry_program_id(): DoctorCheck {
    try {
      const program_id = this.registry_repository.program_id();

      return ok_check(
        'registry_program_id',
        `Using registry program ${program_id}`,
      );
    } catch (error) {
      return error_check('registry_program_id', error);
    }
  }

  private async check_gateway_reachable(): Promise<DoctorCheck> {
    const url = `${this.gateway_url.replace(/\/$/, '')}/publish`;

    try {
      const response = await fetch_with_timeout(url, GATEWAY_PROBE_TIMEOUT_MS);

      if (!response.ok) {
        return warn_check(
          'gateway_reachable',
          `Gateway responded ${response.status} ${response.statusText} at ${url}. Publishing requires the gateway's /publish route to load in a browser.`,
        );
      }

      return ok_check(
        'gateway_reachable',
        `Gateway publishing UI reachable at ${url}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return error_check_message(
        'gateway_reachable',
        `Could not reach ${url} (${message}). Start \`pnpm gateway:dev\` or check GUTENBERG_CLI_GATEWAY_URL — publishing now happens in the browser.`,
      );
    }
  }

  private async check_irys_bundler(): Promise<DoctorCheck> {
    try {
      const response = await fetch_with_timeout(
        `${this.irys_gateway.replace(/\/$/, '')}/`,
        GATEWAY_PROBE_TIMEOUT_MS,
      );

      if (!response.ok) {
        return warn_check(
          'irys_bundler',
          `Irys gateway responded ${response.status} ${response.statusText}`,
        );
      }

      return ok_check(
        'irys_bundler',
        `Irys gateway reachable (${this.irys_network})`,
      );
    } catch (error) {
      return error_check('irys_bundler', error);
    }
  }
}

async function fetch_with_timeout(
  url: string,
  timeout_ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeout_ms);

  try {
    return await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timeout);
  }
}

function ok_check(name: string, message: string): DoctorCheck {
  return { name, status: 'ok', message };
}

function warn_check(name: string, message: string): DoctorCheck {
  return { name, status: 'warn', message };
}

function error_check(name: string, error: unknown): DoctorCheck {
  return {
    name,
    status: 'error',
    message: error instanceof Error ? error.message : String(error),
  };
}

function error_check_message(name: string, message: string): DoctorCheck {
  return { name, status: 'error', message };
}

function safe_host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
