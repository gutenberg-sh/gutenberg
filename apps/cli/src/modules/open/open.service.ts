import { Injectable } from '@nestjs/common';

import { extract_site_tarball } from '../../common/helpers/site-bundle';
import { ManifestService } from '../manifest/manifest.service';
import { RegistryService } from '../registry/registry.service';
import { StorageService } from '../storage/storage.service';

import type {
  OpenManifestOptions,
  OpenResult,
  OpenSiteOptions,
} from './open.types';

@Injectable()
export class OpenService {
  constructor(
    private readonly manifest_service: ManifestService,
    private readonly registry_service: RegistryService,
    private readonly storage_service: StorageService,
  ) {}

  async open_site(options: OpenSiteOptions): Promise<OpenResult> {
    if (
      options.source.startsWith('http://') ||
      options.source.startsWith('https://')
    ) {
      return this.open_manifest({ manifest_uri: options.source });
    }

    const release = await this.registry_service.find_release({
      name: options.source,
      version: options.version,
    });

    if (!release) {
      throw new Error(
        options.version
          ? `No release found for ${options.source}@${options.version}`
          : `No release found for ${options.source}`,
      );
    }

    const result = await this.open_manifest({
      manifest_uri: release.manifest,
      expected_release: release,
    });

    return {
      ...result,
      release_pda: this.registry_service.release_address({
        publisher: release.publisher,
        name: release.name,
        version: release.version,
      }),
    };
  }

  async open_manifest(options: OpenManifestOptions): Promise<OpenResult> {
    const manifest_bytes = await this.storage_service.get_blob(
      options.manifest_uri,
    );
    const manifest_text = strip_utf8_bom(manifest_bytes.toString('utf8'));

    let parsed: unknown;

    try {
      parsed = JSON.parse(manifest_text);
    } catch {
      throw new Error('Manifest is not valid JSON');
    }

    /**
     * Publish registers sha256(canonical JSON string). Gateways may tweak raw bytes
     * (whitespace, BOM); comparing the hash of canonical JSON matches registration.
     */
    if (options.expected_release) {
      let canonical: string;

      try {
        canonical = this.manifest_service.canonical_json(parsed);
      } catch {
        throw new Error('Manifest hash does not match the registered release');
      }

      if (
        this.manifest_service.sha256_hash(canonical) !==
        options.expected_release.manifest_hash
      ) {
        throw new Error('Manifest hash does not match the registered release');
      }
    }

    const manifest = parsed;

    this.manifest_service.assert_valid_manifest(manifest);

    if (!this.manifest_service.verify_manifest(manifest)) {
      throw new Error('Manifest signature verification failed');
    }

    if (options.expected_release) {
      const release = options.expected_release;

      if (
        manifest.publisher !== release.publisher ||
        manifest.name !== release.name ||
        manifest.version !== release.version
      ) {
        throw new Error('Manifest does not match the registered release');
      }
    }

    const bundle_bytes = await this.storage_service.get_blob(manifest.bundle_uri);

    if (
      this.manifest_service.sha256_hash(bundle_bytes) !== manifest.bundle_hash
    ) {
      throw new Error('Site bundle hash does not match manifest bundle_hash');
    }

    const extracted = await extract_site_tarball(bundle_bytes);

    let entry_content: string | undefined;
    const files: Record<`/${string}`, Buffer> = {};

    for (const [path, file] of Object.entries(manifest.files)) {
      const bytes = extracted.get(path);

      if (!bytes) {
        throw new Error(`Missing path ${path} in site bundle`);
      }

      if (!this.manifest_service.verify_file_hash(file, bytes)) {
        throw new Error(`File hash verification failed for ${path}`);
      }

      files[path as `/${string}`] = bytes;

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
      files,
    };
  }
}

function strip_utf8_bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
