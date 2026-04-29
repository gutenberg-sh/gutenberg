import { Inject, Injectable } from '@nestjs/common';

import {
  REGISTRY_PROGRAM_ID_KEY,
  SOLANA_RPC_URL_KEY,
  STORAGE_BUCKET_KEY,
  STORAGE_ENDPOINT_KEY,
} from '../config/config.symbols';
import { SolanaRegistryRepository } from '../registry/solana-registry.repository';
import { SolanaWalletRepository } from '../solana/solana-wallet.repository';
import { S3StorageRepository } from '../storage/s3-storage.repository';

import type { DoctorCheck, DoctorResult } from './doctor.types';

@Injectable()
export class DoctorService {
  constructor(
    private readonly s3StorageRepository: S3StorageRepository,
    private readonly solanaRegistryRepository: SolanaRegistryRepository,
    private readonly solanaWalletRepository: SolanaWalletRepository,
    @Inject(STORAGE_ENDPOINT_KEY) private readonly storageEndpoint: string,
    @Inject(STORAGE_BUCKET_KEY) private readonly storageBucket: string,
    @Inject(SOLANA_RPC_URL_KEY) private readonly solanaRpcUrl: string,
    @Inject(REGISTRY_PROGRAM_ID_KEY)
    private readonly registryProgramId: string | undefined,
  ) {}

  async check(): Promise<DoctorResult> {
    const checks: DoctorCheck[] = [
      this.check_storage_config(),
      await this.check_s3_bucket_access(),
      this.check_solana_private_key(),
      await this.check_solana_rpc(),
      await this.check_solana_wallet_balance(),
      this.check_registry_program_id(),
    ];

    return {
      ok: checks.every((check) => check.status === 'ok'),
      checks,
    };
  }

  private check_storage_config(): DoctorCheck {
    return ok_check(
      'storage_config',
      `Using bucket ${this.storageBucket} at ${this.storageEndpoint}`,
    );
  }

  private async check_s3_bucket_access(): Promise<DoctorCheck> {
    try {
      await this.s3StorageRepository.check_bucket_access();

      return ok_check('s3_bucket_access', `Can access ${this.storageBucket}`);
    } catch (error) {
      return error_check('s3_bucket_access', error);
    }
  }

  private check_solana_private_key(): DoctorCheck {
    try {
      const wallet = this.solanaWalletRepository.load_keypair();

      return ok_check(
        'solana_private_key',
        `Loaded wallet ${wallet.publicKey.toBase58()} from VERITAS_SOLANA_PRIVATE_KEY`,
      );
    } catch (error) {
      return error_check('solana_private_key', error);
    }
  }

  private async check_solana_rpc(): Promise<DoctorCheck> {
    try {
      const version = await this.solanaRegistryRepository.check_rpc_connection();

      return ok_check(
        'solana_rpc',
        `Connected to ${this.solanaRpcUrl} (solana-core ${version})`,
      );
    } catch (error) {
      return error_check('solana_rpc', error);
    }
  }

  private async check_solana_wallet_balance(): Promise<DoctorCheck> {
    try {
      const wallet = await this.solanaRegistryRepository.get_wallet_balance();

      if (wallet.sol === 0) {
        return {
          name: 'solana_wallet_balance',
          status: 'error',
          message: `Wallet ${wallet.public_key.toBase58()} has 0 SOL on ${this.solanaRpcUrl}`,
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
      const program_id =
        this.solanaRegistryRepository.check_registry_program_id();

      return ok_check(
        'registry_program_id',
        `Using registry program ${program_id.toBase58()}`,
      );
    } catch (error) {
      return error_check(
        'registry_program_id',
        this.registryProgramId
          ? error
          : new Error('VERITAS_REGISTRY_PROGRAM_ID is required'),
      );
    }
  }
}

function ok_check(name: string, message: string): DoctorCheck {
  return {
    name,
    status: 'ok',
    message,
  };
}

function error_check(name: string, error: unknown): DoctorCheck {
  return {
    name,
    status: 'error',
    message: error instanceof Error ? error.message : String(error),
  };
}
