import type { ContentUri, GutenbergManifest } from '../manifest/manifest.types';
import type { GutenbergReleaseEvent } from '../registry/registry.types';

export type OpenManifestOptions = {
  manifest_uri: ContentUri;
  expected_release?: GutenbergReleaseEvent;
};

export type OpenSiteOptions = {
  source: string;
  version?: string;
};

export type OpenResult = {
  manifest: GutenbergManifest;
  manifest_uri: ContentUri;
  name: string;
  version: string;
  entry: `/${string}`;
  content: string;
  file_count: number;
};
