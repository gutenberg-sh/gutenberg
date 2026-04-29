import type {
  ContentUri,
  VeritasManifestV0,
} from '../manifest/manifest.types';
import type { VeritasReleaseEventV0 } from '../registry/registry.types';

export type PublishOptions = {
  folder: string;
  name: string;
  version: string;
  entry?: `/${string}`;
};

export type PublishResult = {
  manifest: VeritasManifestV0;
  manifest_uri: ContentUri;
  release: VeritasReleaseEventV0;
  file_count: number;
  total_bytes: number;
};
