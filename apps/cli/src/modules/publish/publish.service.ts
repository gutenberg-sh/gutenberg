import { Injectable } from '@nestjs/common';
import type { KeyObject } from 'node:crypto';

import type {
  GutenbergManifestFile,
  GutenbergUnsignedManifest,
} from '../../common/types/manifest.types';
import { KeysService } from '../keys/keys.service';
import { ManifestService } from '../manifest/manifest.service';
import { release_event_type } from '../registry/registry.types';
import { RegistryService } from '../registry/registry.service';
import { StorageService } from '../storage/storage.service';

import { create_site_tarball } from '../../common/helpers/site-bundle';

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
        publisher: keypair.publisher,
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

    const manifest_files: Record<`/${string}`, GutenbergManifestFile> = {};
    let total_bytes = 0;

    for (const file of files) {
      const bytes = await this.site_files_repository.read_file(
        file.absolute_path,
      );
      total_bytes += bytes.byteLength;
      manifest_files[file.site_path] = {
        hash: this.manifest_service.sha256_hash(bytes),
      };
    }

    const tarball = await create_site_tarball(root, files);
    const bundle_hash = this.manifest_service.sha256_hash(tarball);
    const created_at = new Date().toISOString();

    const base_manifest_fields = {
      bundle_hash,
      name: options.name,
      version: options.version,
      entry: options.entry ?? '/index.md',
      files: manifest_files,
      publisher: keypair.publisher,
      created_at,
    } as const;

    const estimated_manifest_bytes = this.estimate_manifest_size(
      {
        ...base_manifest_fields,
        bundle_uri: this.storage_service.placeholder_content_uri(),
      },
      keypair.private_key,
    );

    if (hooks.confirm_cost) {
      const total_upload_bytes = tarball.byteLength + estimated_manifest_bytes;
      const cost = await this.storage_service.estimate_cost(total_upload_bytes);
      const preview: PublishCostPreview = {
        bundle_bytes: tarball.byteLength,
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

    const bundle_uri = await this.storage_service.put_blob(tarball);
    const unsigned_manifest: GutenbergUnsignedManifest = {
      ...base_manifest_fields,
      bundle_uri,
    };
    const manifest = this.manifest_service.sign_manifest(
      unsigned_manifest,
      keypair.private_key,
    );
    const manifest_json = this.manifest_service.canonical_json(manifest);
    const manifest_hash = this.manifest_service.sha256_hash(manifest_json);
    const manifest_uri = await this.storage_service.put_manifest(manifest_json);
    const release = {
      type: release_event_type,
      name: manifest.name,
      version: manifest.version,
      manifest: manifest_uri,
      manifest_hash,
      publisher: manifest.publisher,
      created_at: new Date().toISOString(),
    } as const;

    await this.registry_service.append_release(release);

    return {
      manifest,
      manifest_uri,
      release,
      file_count: files.length,
      total_bytes,
    };
  }

  /**
   * Canonical JSON byte length of a fully-signed manifest. Ed25519 signatures
   * are fixed-size, so signing with a placeholder bundle URI of the same
   * shape as real URIs matches the final manifest byte size exactly.
   */
  private estimate_manifest_size(
    unsigned_manifest: GutenbergUnsignedManifest,
    private_key: KeyObject,
  ): number {
    const signed = this.manifest_service.sign_manifest(
      unsigned_manifest,
      private_key,
    );

    return Buffer.byteLength(
      this.manifest_service.canonical_json(signed),
      'utf8',
    );
  }
}
