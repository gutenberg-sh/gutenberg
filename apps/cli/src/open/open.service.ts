import { Inject, Injectable } from '@nestjs/common';

import type { ContentUri } from '../manifest/manifest.types';
import { ManifestService } from '../manifest/manifest.service';
import { RegistryService } from '../registry/registry.service';
import { CONTENT_STORE } from '../storage/storage.tokens';
import type { ContentStore } from '../storage/storage.types';
import type {
  OpenManifestOptions,
  OpenResult,
  OpenSiteOptions,
} from './open.types';

@Injectable()
export class OpenService {
  constructor(
    private readonly manifestService: ManifestService,
    private readonly registryService: RegistryService,
    @Inject(CONTENT_STORE) private readonly contentStore: ContentStore,
  ) {}

  async open_site(options: OpenSiteOptions): Promise<OpenResult> {
    if (options.source.startsWith('s3://')) {
      return this.open_manifest({
        manifest_uri: options.source as ContentUri,
      });
    }

    const release = await this.registryService.find_release(
      {
        name: options.source,
        version: options.version,
      },
    );

    if (!release) {
      throw new Error(
        options.version
          ? `No release found for ${options.source}@${options.version}`
          : `No release found for ${options.source}`,
      );
    }

    return this.open_manifest({
      manifest_uri: release.manifest,
      expected_release: release,
    });
  }

  async open_manifest(options: OpenManifestOptions): Promise<OpenResult> {
    const manifest_bytes = await this.contentStore.get_blob(
      options.manifest_uri,
    );

    if (
      options.expected_release &&
      this.manifestService.sha256_hash(manifest_bytes) !==
        options.expected_release.manifest_hash
    ) {
      throw new Error('Manifest hash does not match the registered release');
    }

    const manifest: unknown = JSON.parse(manifest_bytes.toString('utf8'));

    this.manifestService.assert_valid_manifest(manifest);

    if (!this.manifestService.verify_manifest(manifest)) {
      throw new Error('Manifest signature verification failed');
    }

    if (options.expected_release) {
      this.assert_manifest_matches_release(manifest, options.expected_release);
    }

    let entry_content: string | undefined;

    for (const [path, file] of Object.entries(manifest.files)) {
      const bytes = await this.contentStore.get_blob(file.uri);

      if (!this.manifestService.verify_file_hash(file, bytes)) {
        throw new Error(`File hash verification failed for ${path}`);
      }

      if (path === manifest.entry) {
        entry_content = bytes.toString('utf8');
      }
    }

    if (entry_content === undefined) {
      throw new Error(`Manifest entry not found: ${manifest.entry}`);
    }

    return {
      manifest,
      manifest_uri: options.manifest_uri,
      name: manifest.name,
      version: manifest.version,
      entry: manifest.entry,
      content: entry_content,
      file_count: Object.keys(manifest.files).length,
    };
  }

  private assert_manifest_matches_release(
    manifest: OpenResult['manifest'],
    release: NonNullable<OpenManifestOptions['expected_release']>,
  ): void {
    if (
      manifest.publisher !== release.publisher ||
      manifest.name !== release.name ||
      manifest.version !== release.version
    ) {
      throw new Error('Manifest does not match the registered release');
    }
  }
}
