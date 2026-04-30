import { Inject, Injectable } from '@nestjs/common';

import {
  ARWEAVE_GATEWAY_URLS,
  ARWEAVE_TRUST_MIRRORS,
  IRYS_NETWORK,
  SOLANA_RPC_URL,
} from '../../common/config/config.tokens';
import {
  irys_settlement_mirror,
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
    @Inject(ARWEAVE_GATEWAY_URLS)
    private readonly arweave_gateways: readonly string[],
    @Inject(ARWEAVE_TRUST_MIRRORS)
    private readonly trust_mirrors: readonly string[],
    @Inject(IRYS_NETWORK)
    private readonly irys_network: IrysNetwork,
    @Inject(SOLANA_RPC_URL) private readonly solana_rpc_url: string,
  ) {}

  async check(): Promise<DoctorResult> {
    const wallet = await this.try_load_wallet();
    const checks: DoctorCheck[] = [
      this.check_gateway_config(),
      this.check_browser_gateway_alignment(),
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

  private check_gateway_config(): DoctorCheck {
    const trust_hosts = this.trust_mirrors.map(safe_host).join(', ');
    const settlement = irys_settlement_mirror(this.irys_network);
    const settlement_already_listed = this.trust_mirrors.some(
      (m) => m.replace(/\/$/, '') === settlement,
    );
    const settlement_note = settlement_already_listed
      ? ' (also present in trust mirrors)'
      : '';

    return ok_check(
      'gateway_config',
      `Irys network ${this.irys_network}; trust mirrors (${this.trust_mirrors.length}): ${trust_hosts}; settlement mirror: ${safe_host(settlement)}${settlement_note}`,
    );
  }

  private check_browser_gateway_alignment(): DoctorCheck {
    const raw = process.env.VITE_GUTENBERG_ARWEAVE_GATEWAYS;

    if (!raw) {
      return warn_check(
        'browser_gateway_alignment',
        'VITE_GUTENBERG_ARWEAVE_GATEWAYS is not set; the browser gateway will refuse to start. Configure it to mirror the CLI list (and include the Irys network gateway when publishing via Irys).',
      );
    }

    let browser_list: string[];

    try {
      browser_list = parse_gateway_list(raw);
    } catch (error) {
      return error_check('browser_gateway_alignment', error);
    }

    const settlement = irys_settlement_mirror(this.irys_network);
    const includes_settlement = browser_list.some(
      (m) => m.replace(/\/$/, '') === settlement,
    );

    if (!includes_settlement) {
      const action =
        this.irys_network === 'devnet'
          ? `add ${settlement} to VITE_GUTENBERG_ARWEAVE_GATEWAYS — Irys devnet uploads never settle to Arweave mainnet, so the browser cannot resolve them through any other gateway.`
          : `add ${settlement} to VITE_GUTENBERG_ARWEAVE_GATEWAYS — Irys mainnet uploads need the Irys gateway to resolve until they propagate to Arweave proper (hours-to-days).`;

      return this.irys_network === 'devnet'
        ? error_check_message('browser_gateway_alignment', action)
        : warn_check('browser_gateway_alignment', action);
    }

    return ok_check(
      'browser_gateway_alignment',
      `Browser gateway list reaches ${safe_host(settlement)} for Irys ${this.irys_network} uploads`,
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
