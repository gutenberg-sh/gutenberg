import { Inject, Injectable } from '@nestjs/common';

import {
  ARWEAVE_MIRRORS,
  IRYS_GATEWAY_URL,
  IRYS_NETWORK,
  SOLANA_RPC_URL,
} from '../../common/config/config.tokens';
import {
  parse_gateway_list,
  type IrysNetwork,
} from '../../common/helpers/gateway-list';
import { SolanaRegistryRepository } from '../registry/solana-registry.repository';
import {
  type LoadedWallet,
  SolanaWalletRepository,
} from '../solana/solana-wallet.repository';
import { wallet_storage_path } from '../solana/wallet-storage';
import { StorageService } from '../storage/storage.service';

import type { DoctorCheck, DoctorResult } from './doctor.types';

@Injectable()
export class DoctorService {
  constructor(
    private readonly storage_service: StorageService,
    private readonly registry_repository: SolanaRegistryRepository,
    private readonly wallet_repository: SolanaWalletRepository,
    @Inject(IRYS_GATEWAY_URL) private readonly irys_gateway: string,
    @Inject(ARWEAVE_MIRRORS)
    private readonly arweave_mirrors: readonly string[],
    @Inject(IRYS_NETWORK)
    private readonly irys_network: IrysNetwork,
    @Inject(SOLANA_RPC_URL) private readonly solana_rpc_url: string,
  ) {}

  async check(): Promise<DoctorResult> {
    const wallet = await this.try_load_wallet();
    const checks: DoctorCheck[] = [
      this.check_canonical_gateway(),
      this.check_mirrors(),
      this.check_browser_canonical_alignment(),
      this.check_browser_mirrors_alignment(),
      this.check_solana_publisher_key(wallet),
      await this.check_solana_rpc(),
      this.check_registry_program_id(),
    ];

    if (wallet) {
      checks.push(await this.check_irys_bundler());
      checks.push(await this.check_irys_balance());
      checks.push(await this.check_solana_wallet_balance());
    }

    return {
      ok: checks.every((check) => check.status !== 'error'),
      checks,
    };
  }

  private async try_load_wallet(): Promise<LoadedWallet | undefined> {
    try {
      return await this.wallet_repository.try_load_keypair();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Failed to read configured wallet: ${message}`, {
        cause: error,
      });
    }
  }

  private check_canonical_gateway(): DoctorCheck {
    return ok_check(
      'canonical_gateway',
      `Canonical Irys gateway (${this.irys_network}): ${safe_host(this.irys_gateway)}`,
    );
  }

  private check_mirrors(): DoctorCheck {
    if (this.arweave_mirrors.length === 0) {
      return warn_check(
        'mirrors',
        'No Arweave mirrors configured — reads depend entirely on Irys availability. Add at least one fallback (arweave.net, ar-io.dev, g8way.io, …) to GUTENBERG_ARWEAVE_MIRRORS.',
      );
    }

    const hosts = this.arweave_mirrors.map(safe_host).join(', ');

    return ok_check(
      'mirrors',
      `${this.arweave_mirrors.length} Arweave mirror(s) configured: ${hosts}`,
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

  private check_solana_publisher_key(
    wallet: LoadedWallet | undefined,
  ): DoctorCheck {
    if (!wallet) {
      return warn_check(
        'solana_publisher_key',
        `No publisher key configured. Run \`gutenberg publish ...\` to paste one and save it to ${wallet_storage_path}.`,
      );
    }

    const source =
      wallet.source === 'env'
        ? 'GUTENBERG_SOLANA_PRIVATE_KEY'
        : wallet.source === 'stored'
          ? wallet_storage_path
          : 'interactive prompt';

    return ok_check(
      'solana_publisher_key',
      `Loaded wallet ${wallet.keypair.publicKey.toBase58()} from ${source}`,
    );
  }

  private async check_irys_bundler(): Promise<DoctorCheck> {
    try {
      await this.storage_service.check_connection();

      return ok_check(
        'irys_bundler',
        `Irys bundler reachable (${this.irys_network})`,
      );
    } catch (error) {
      return error_check('irys_bundler', error);
    }
  }

  private async check_irys_balance(): Promise<DoctorCheck> {
    try {
      const balance = await this.storage_service.get_bundler_balance();

      if (balance.isZero()) {
        if (is_local_solana_rpc(this.solana_rpc_url)) {
          return warn_check(
            'irys_balance',
            'Bundler balance is 0 — expected with a local validator: Irys is funded from devnet/mainnet SOL, not localnet. Point GUTENBERG_SOLANA_RPC_URL at devnet or mainnet (matching GUTENBERG_IRYS_NETWORK), fund the bundler, then publish; registry-only flows on localhost still work.',
          );
        }

        return {
          name: 'irys_balance',
          status: 'error',
          message:
            'Irys bundler balance is 0 — fund it with SOL (see Irys docs / irys.fund in the SDK) before publishing',
        };
      }

      return ok_check(
        'irys_balance',
        `Irys bundler balance ${balance.toString()} (atomic units)`,
      );
    } catch (error) {
      return error_check('irys_balance', error);
    }
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

  private async check_solana_wallet_balance(): Promise<DoctorCheck> {
    try {
      const wallet = await this.registry_repository.get_wallet_balance();

      if (wallet.sol === 0) {
        return {
          name: 'solana_wallet_balance',
          status: 'error',
          message: `Wallet ${wallet.public_key.toBase58()} has 0 SOL on ${this.solana_rpc_url}`,
        };
      }

      return ok_check(
        'solana_wallet_balance',
        `Wallet ${wallet.public_key.toBase58()} has ${wallet.sol.toFixed(6)} SOL`,
      );
    } catch (error) {
      return error_check('solana_wallet_balance', error);
    }
  }

  private check_registry_program_id(): DoctorCheck {
    try {
      const program_id = this.registry_repository.program_id();

      return ok_check(
        'registry_program_id',
        `Using registry program ${program_id.toBase58()}`,
      );
    } catch (error) {
      return error_check('registry_program_id', error);
    }
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

function is_local_solana_rpc(rpc_url: string): boolean {
  try {
    const u = new URL(rpc_url);
    const host = u.hostname.toLowerCase();

    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0'
    );
  } catch {
    return false;
  }
}
