import type {
  ContentUri,
  VeritasManifestV0,
} from '../manifest/manifest.types';

export type OpenManifestOptions = {
  manifest_uri: ContentUri;
};

export type OpenSiteOptions = {
  source: string;
  version?: string;
};

export type OpenResult = {
  manifest: VeritasManifestV0;
  manifest_uri: ContentUri;
  name: string;
  version: string;
  entry: `/${string}`;
  content: string;
  file_count: number;
};
