import { Inject, Injectable } from '@nestjs/common';

import { KeysService } from '../keys/keys.service';
import {
  manifest_type,
  type VeritasManifestFileV0,
  type VeritasUnsignedManifestV0,
} from '../manifest/manifest.types';
import { ManifestService } from '../manifest/manifest.service';
import { RegistryService } from '../registry/registry.service';
import { CONTENT_STORE } from '../storage/storage.tokens';
import type { ContentStore } from '../storage/storage.types';

import { SiteFilesRepository } from './site-files.repository';
import type { PublishOptions, PublishResult } from './publish.types';

@Injectable()
export class PublishService {
  constructor(
    private readonly keysService: KeysService,
    private readonly manifestService: ManifestService,
    private readonly registryService: RegistryService,
    private readonly siteFilesRepository: SiteFilesRepository,
    @Inject(CONTENT_STORE) private readonly contentStore: ContentStore,
  ) {}

  async publish_site(options: PublishOptions): Promise<PublishResult> {
    const root = await this.siteFilesRepository.assert_directory(
      options.folder,
    );

    const keypair = this.keysService.load_publisher_key();

    if (
      await this.registryService.has_release(
        {
          name: options.name,
          version: options.version,
          publisher: keypair.publisher,
        },
      )
    ) {
      throw new Error(
        `Release already exists for ${options.name}@${options.version}`,
      );
    }

    await this.registryService.assert_can_publish();

    const files = await this.siteFilesRepository.list_site_files(root);

    if (files.length === 0) {
      throw new Error('Publish folder does not contain any files');
    }

    const manifest_files: Record<`/${string}`, VeritasManifestFileV0> = {};
    let total_bytes = 0;

    for (const file of files) {
      const bytes = await this.siteFilesRepository.read_file(
        file.absolute_path,
      );
      total_bytes += bytes.byteLength;
      manifest_files[file.site_path] = {
        hash: this.manifestService.sha256_hash(bytes),
        uri: await this.contentStore.put_blob(bytes),
      };
    }

    const unsigned_manifest: VeritasUnsignedManifestV0 = {
      type: manifest_type,
      name: options.name,
      version: options.version,
      entry: options.entry ?? '/index.md',
      files: manifest_files,
      publisher: keypair.publisher,
      created_at: new Date().toISOString(),
    };
    const manifest = this.manifestService.sign_manifest(
      unsigned_manifest,
      keypair.private_key,
    );
    const manifest_uri = await this.contentStore.put_manifest(
      this.manifestService.canonical_json(manifest),
    );
    const release = this.registryService.sign_release_event(
      {
        type: 'veritas.release.v0',
        name: manifest.name,
        version: manifest.version,
        manifest: manifest_uri,
        publisher: manifest.publisher,
        created_at: new Date().toISOString(),
      },
      keypair.private_key,
    );

    await this.registryService.append_release(release);

    return {
      manifest,
      manifest_uri,
      release,
      file_count: files.length,
      total_bytes,
    };
  }
}
