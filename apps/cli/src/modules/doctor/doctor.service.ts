import { Inject, Injectable } from '@nestjs/common';

import {
  ARWEAVE_GATEWAY_URL,
  IRYS_NETWORK,
  SOLANA_RPC_URL,
} from '../../common/config/config.tokens';
import { SolanaRegistryRepository } from '../registry/solana-registry.repository';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';
import { StorageService } from '../storage/storage.service';

import type { DoctorCheck, DoctorResult } from './doctor.types';

@Injectable()
export class DoctorService {
  constructor(
    private readonly storage_service: StorageService,
    private readonly registry_repository: SolanaRegistryRepository,
    private readonly wallet_repository: SolanaWalletRepository,
    @Inject(ARWEAVE_GATEWAY_URL) private readonly arweave_gateway_url: string,
    @Inject(IRYS_NETWORK)
    private readonly irys_network: 'mainnet' | 'devnet',
    @Inject(SOLANA_RPC_URL) private readonly solana_rpc_url: string,
  ) {}

  async check(): Promise<DoctorResult> {
    const checks: DoctorCheck[] = [
      ok_check(
        'irys_config',
        `network ${this.irys_network}, read gateway ${this.arweave_gateway_url}`,
      ),
      await this.check_irys_bundler(),
      await this.check_irys_balance(),
      this.check_solana_private_key(),
      await this.check_solana_rpc(),
      await this.check_solana_wallet_balance(),
      this.check_registry_program_id(),
    ];

    return {
      ok: checks.every((check) => check.status !== 'error'),
      checks,
    };
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

  private check_solana_private_key(): DoctorCheck {
    try {
      const wallet = this.wallet_repository.load_keypair();

      return ok_check(
        'solana_private_key',
        `Loaded wallet ${wallet.publicKey.toBase58()} from GUTENBERG_SOLANA_PRIVATE_KEY`,
      );
    } catch (error) {
      return error_check('solana_private_key', error);
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
