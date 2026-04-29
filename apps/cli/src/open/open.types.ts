import type {
  ContentUri,
  GutenbergManifestV0,
} from '../manifest/manifest.types';
import type { GutenbergReleaseEventV0 } from '../registry/registry.types';

export type OpenManifestOptions = {
  manifest_uri: ContentUri;
  expected_release?: GutenbergReleaseEventV0;
};

export type OpenSiteOptions = {
  source: string;
  version?: string;
};

export type OpenResult = {
  manifest: GutenbergManifestV0;
  manifest_uri: ContentUri;
  name: string;
  version: string;
  entry: `/${string}`;
  content: string;
  file_count: number;
};
