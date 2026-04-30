import { Inject, Injectable } from '@nestjs/common';
import type { KeyObject } from 'node:crypto';

import { SOLANA_RPC_URL } from '../../common/config/config.tokens';
import { infer_chain_id } from '../../common/helpers/chain-id';
import { guess_mime_for_path } from '../../common/helpers/mime';
import {
  MANIFEST_SCHEMA_VERSION,
  STORAGE_LAYOUT_PER_FILE,
  type GutenbergManifestFile,
  type GutenbergUnsignedManifest,
} from '../../common/types/manifest.types';
import { KeysService } from '../keys/keys.service';
import { ManifestService } from '../manifest/manifest.service';
import { release_event_type } from '../registry/registry.types';
import { RegistryService } from '../registry/registry.service';
import { GUTENBERG_REGISTRY_PROGRAM_ID } from '../registry/solana-registry.repository';
import { StorageService } from '../storage/storage.service';

import { SiteFilesRepository } from './site-files.repository';
import type {
  PublishCostPreview,
  PublishHooks,
  PublishOptions,
  PublishResult,
} from './publish.types';

export class PublishCancelledError extends Error {
  constructor() {
    super('Publish cancelled by user');
    this.name = 'PublishCancelledError';
  }
}

@Injectable()
export class PublishService {
  constructor(
    private readonly keys_service: KeysService,
    private readonly manifest_service: ManifestService,
    private readonly registry_service: RegistryService,
    private readonly site_files_repository: SiteFilesRepository,
    private readonly storage_service: StorageService,
    @Inject(SOLANA_RPC_URL) private readonly rpc_url: string,
  ) {}

  async publish_site(
    options: PublishOptions,
    hooks: PublishHooks = {},
  ): Promise<PublishResult> {
    const root = await this.site_files_repository.assert_directory(
      this.site_files_repository.resolve_folder(options.folder),
    );

    const keypair = await this.keys_service.load_publisher_key();

    await this.registry_service.assert_name_claimable({
      name: options.name,
      publisher: keypair.publisher,
    });

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

    await this.registry_service.assert_can_publish();

    const files = await this.site_files_repository.list_site_files(root);

    if (files.length === 0) {
      throw new Error('Publish folder does not contain any files');
    }

    type FileBuf = {
      site_path: `/${string}`;
      bytes: Buffer;
      mime: string | undefined;
    };

    const file_buffers: FileBuf[] = [];
    let files_total_bytes = 0;

    for (const file of files) {
      const bytes = await this.site_files_repository.read_file(
        file.absolute_path,
      );
      files_total_bytes += bytes.byteLength;
      file_buffers.push({
        site_path: file.site_path,
        bytes,
        mime: guess_mime_for_path(file.site_path),
      });
    }

    const created_at = new Date().toISOString();
    const chain_id = infer_chain_id(this.rpc_url);

    const placeholder_uri = this.storage_service.placeholder_content_uri();
    const estimated_manifest_bytes = this.estimate_manifest_size({
      file_buffers,
      placeholder_uri,
      options,
      created_at,
      chain_id,
      private_key: keypair.private_key,
      publisher: keypair.publisher,
    });

    if (hooks.confirm_cost) {
      const total_upload_bytes = files_total_bytes + estimated_manifest_bytes;
      const cost = await this.storage_service.estimate_cost(total_upload_bytes);
      const preview: PublishCostPreview = {
        files_bytes: files_total_bytes,
        manifest_bytes: estimated_manifest_bytes,
        total_bytes: total_upload_bytes,
        file_count: files.length,
        cost,
      };

      const confirmed = await hooks.confirm_cost(preview);

      if (!confirmed) {
        throw new PublishCancelledError();
      }
    }

    const manifest_files: Record<`/${string}`, GutenbergManifestFile> = {};

    for (let i = 0; i < file_buffers.length; i++) {
      const fb = file_buffers[i]!;
      const uri = await this.storage_service.put_file(fb.bytes, fb.mime);

      manifest_files[fb.site_path] = {
        hash: this.manifest_service.sha256_hash(fb.bytes),
        size_bytes: fb.bytes.byteLength,
        uri,
        ...(fb.mime ? { mime: fb.mime } : {}),
      };

      hooks.on_file_uploaded?.({
        index: i,
        total: file_buffers.length,
        site_path: fb.site_path,
        size_bytes: fb.bytes.byteLength,
      });
    }

    const content_hash = this.manifest_service.files_content_hash(manifest_files);
    const content_size_bytes = files_total_bytes;

    const unsigned_manifest: GutenbergUnsignedManifest = {
      schema_version: MANIFEST_SCHEMA_VERSION,
      storage_layout: STORAGE_LAYOUT_PER_FILE,
      name: options.name,
      version: options.version,
      publisher: keypair.publisher,
      created_at,
      entry: options.entry ?? '/index.md',
      files: manifest_files,
      content_hash,
      content_size_bytes,
      chain: {
        chain_id,
        program_id: GUTENBERG_REGISTRY_PROGRAM_ID,
      },
      ...(options.prev_version ? { prev_version: options.prev_version } : {}),
      ...(options.license ? { license: options.license } : {}),
      ...(options.language ? { language: options.language } : {}),
      ...(options.tags && options.tags.length > 0
        ? { tags: options.tags }
        : {}),
    };

    const manifest = this.manifest_service.sign_manifest(
      unsigned_manifest,
      keypair.private_key,
    );
    const manifest_json = this.manifest_service.canonical_json(manifest);
    const manifest_hash = this.manifest_service.sha256_hash(manifest_json);
    const manifest_uri = await this.storage_service.put_manifest(manifest_json);

    await this.registry_service.append_release({
      name: manifest.name,
      version: manifest.version,
      manifest_uri,
      manifest_hash,
      content_hash,
      content_size_bytes,
    });

    const release_pda = this.registry_service.release_address({
      name: manifest.name,
      version: manifest.version,
    });

    return {
      manifest,
      manifest_uri,
      release: {
        type: release_event_type,
        schema_version: MANIFEST_SCHEMA_VERSION,
        publisher: manifest.publisher,
        name: manifest.name,
        version: manifest.version,
        manifest: manifest_uri,
        manifest_hash,
        content_hash,
        content_size_bytes,
        created_at: new Date().toISOString(),
        created_at_slot: 0,
      },
      release_pda,
      file_count: files.length,
      total_bytes: content_size_bytes,
    };
  }

  private estimate_manifest_size(input: {
    file_buffers: Array<{
      site_path: `/${string}`;
      bytes: Buffer;
      mime: string | undefined;
    }>;
    placeholder_uri: GutenbergUnsignedManifest['files'][`/${string}`]['uri'];
    options: PublishOptions;
    created_at: string;
    chain_id: GutenbergUnsignedManifest['chain']['chain_id'];
    private_key: KeyObject;
    publisher: string;
  }): number {
    const fake_files: Record<`/${string}`, GutenbergManifestFile> = {};
    for (const fb of input.file_buffers) {
      fake_files[fb.site_path] = {
        hash: this.manifest_service.sha256_hash(fb.bytes),
        size_bytes: fb.bytes.byteLength,
        uri: input.placeholder_uri,
        ...(fb.mime ? { mime: fb.mime } : {}),
      };
    }

    const fake_manifest: GutenbergUnsignedManifest = {
      schema_version: MANIFEST_SCHEMA_VERSION,
      storage_layout: STORAGE_LAYOUT_PER_FILE,
      name: input.options.name,
      version: input.options.version,
      publisher: input.publisher,
      created_at: input.created_at,
      entry: input.options.entry ?? '/index.md',
      files: fake_files,
      content_hash: this.manifest_service.files_content_hash(fake_files),
      content_size_bytes: input.file_buffers.reduce(
        (acc, fb) => acc + fb.bytes.byteLength,
        0,
      ),
      chain: {
        chain_id: input.chain_id,
        program_id: GUTENBERG_REGISTRY_PROGRAM_ID,
      },
      ...(input.options.prev_version
        ? { prev_version: input.options.prev_version }
        : {}),
      ...(input.options.license ? { license: input.options.license } : {}),
      ...(input.options.language ? { language: input.options.language } : {}),
      ...(input.options.tags && input.options.tags.length > 0
        ? { tags: input.options.tags }
        : {}),
    };

    const signed = this.manifest_service.sign_manifest(
      fake_manifest,
      input.private_key,
    );

    return Buffer.byteLength(
      this.manifest_service.canonical_json(signed),
      'utf8',
    );
  }
}
