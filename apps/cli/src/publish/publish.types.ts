import type {
  ContentUri,
  GutenbergManifestV0,
} from '../manifest/manifest.types';
import type { GutenbergReleaseEventV0 } from '../registry/registry.types';

export type PublishOptions = {
  folder: string;
  name: string;
  version: string;
  entry?: `/${string}`;
};

export type PublishResult = {
  manifest: GutenbergManifestV0;
  manifest_uri: ContentUri;
  release: GutenbergReleaseEventV0;
  file_count: number;
  total_bytes: number;
};
