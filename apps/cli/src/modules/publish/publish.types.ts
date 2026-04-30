import type {
  ContentUri,
  GutenbergManifest,
} from '../../common/types/manifest.types';
import type { GutenbergReleaseEvent } from '../registry/registry.types';

export type PublishOptions = {
  folder: string;
  name: string;
  version: string;
  entry?: `/${string}`;
};

export type PublishResult = {
  manifest: GutenbergManifest;
  manifest_uri: ContentUri;
  release: GutenbergReleaseEvent;
  file_count: number;
  total_bytes: number;
};
