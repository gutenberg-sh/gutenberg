import {
  PUBLISH_SESSION_PROTOCOL_VERSION,
  type PublishSessionFile,
  type PublishSessionInput,
} from '@gutenberg/core';
import { Inject, Injectable } from '@nestjs/common';

import {
  GATEWAY_URL,
  IRYS_NETWORK,
  SOLANA_RPC_URL,
} from '../../common/config/config.tokens';
import { infer_chain_id } from '../../common/helpers/chain-id';
import { type IrysNetwork } from '../../common/helpers/gateway-list';
import { guess_mime_for_path } from '../../common/helpers/mime';
import { open_url_in_browser } from '../../common/helpers/open-browser';
import { RegistryService } from '../registry/registry.service';
import { GUTENBERG_REGISTRY_PROGRAM_ID } from '../registry/solana-registry.repository';

import { start_publish_session_server } from './publish-session-server';
import { ReleaseFilesRepository } from './release-files.repository';
import type {
  PublishHooks,
  PublishOptions,
  PublishResult,
} from './publish.types';

const PUBLISH_TIMEOUT_MS = 30 * 60_000;

export class PublishCancelledError extends Error {
  constructor(message = 'Publish cancelled by user') {
    super(message);
    this.name = 'PublishCancelledError';
  }
}

@Injectable()
export class PublishService {
  constructor(
    private readonly registry_service: RegistryService,
    private readonly release_files_repository: ReleaseFilesRepository,
    @Inject(SOLANA_RPC_URL) private readonly rpc_url: string,
    @Inject(GATEWAY_URL) private readonly gateway_url: string,
    @Inject(IRYS_NETWORK) private readonly irys_network: IrysNetwork,
  ) {}

  async publish_release(
    options: PublishOptions,
    hooks: PublishHooks = {},
  ): Promise<PublishResult> {
    const root = await this.release_files_repository.assert_directory(
      this.release_files_repository.resolve_folder(options.folder),
    );

    if (
      await this.registry_service.has_release({
        name: options.name,
        version: options.version,
      })
    ) {
      throw new Error(
        `Release already exists for ${options.name}@${options.version}`,
      );
    }

    const files = await this.release_files_repository.list_release_files(root);

    if (files.length === 0) {
      throw new Error('Publish folder does not contain any files');
    }

    const session_files: PublishSessionFile[] = [];
    let files_total_bytes = 0;

    for (const file of files) {
      const bytes = await this.release_files_repository.read_file(
        file.absolute_path,
      );

      files_total_bytes += bytes.byteLength;
      const mime = guess_mime_for_path(file.path);

      session_files.push({
        path: file.path,
        size_bytes: bytes.byteLength,
        ...(mime ? { mime } : {}),
        content_base64: bytes.toString('base64'),
      });
    }

    const session: PublishSessionInput = {
      protocol_version: PUBLISH_SESSION_PROTOCOL_VERSION,
      name: options.name,
      version: options.version,
      entry: options.entry ?? '/index.md',
      ...(options.prev_version ? { prev_version: options.prev_version } : {}),
      ...(options.license ? { license: options.license } : {}),
      ...(options.language ? { language: options.language } : {}),
      ...(options.tags && options.tags.length > 0
        ? { tags: options.tags }
        : {}),
      chain: {
        chain_id: infer_chain_id(this.rpc_url),
        program_id: GUTENBERG_REGISTRY_PROGRAM_ID,
      },
      rpc_url: this.rpc_url,
      irys_network: this.irys_network,
      files: session_files,
    };

    const allowed_origin = this.gateway_url.replace(/\/$/, '');
    const server = await start_publish_session_server({
      session,
      allowed_origin,
      ...(hooks.on_progress
        ? {
            on_progress: (progress) =>
              hooks.on_progress?.({
                kind: progress.kind,
                message: progress.message,
              }),
          }
        : {}),
    });

    const browser_url =
      `${allowed_origin}/publish` +
      `?session=${encodeURIComponent(server.token)}` +
      `&port=${server.port}`;

    try {
      hooks.on_browser_opened?.(browser_url);
      open_url_in_browser(browser_url);

      const outcome = await server.wait_for_outcome(PUBLISH_TIMEOUT_MS);

      if (outcome.kind === 'cancelled') {
        throw new PublishCancelledError(outcome.message);
      }

      if (outcome.kind === 'failed') {
        throw new Error(outcome.message);
      }

      const release = await this.registry_service.find_release({
        name: options.name,
        version: options.version,
      });

      return {
        manifest_uri: outcome.result.manifest_uri,
        manifest_hash: outcome.result.manifest_hash,
        release,
        release_address: outcome.result.release_address,
        signature: outcome.result.signature,
        publisher: outcome.result.publisher,
        file_count: files.length,
        total_bytes: files_total_bytes,
      };
    } finally {
      await server.close();
    }
  }
}
