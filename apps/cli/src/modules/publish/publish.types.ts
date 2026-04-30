import type {
  ContentUri,
  GutenbergManifest,
} from '../../common/types/manifest.types';
import type { GutenbergReleaseEvent } from '../registry/registry.types';
import type { UploadCostEstimate } from '../storage/storage.service';

export type PublishOptions = {
  folder: string;
  name: string;
  version: string;
  entry?: `/${string}`;
};

export type PublishCostPreview = {
  bundle_bytes: number;
  manifest_bytes: number;
  total_bytes: number;
  file_count: number;
  cost: UploadCostEstimate;
};

export type PublishHooks = {
  confirm_cost?: (preview: PublishCostPreview) => Promise<boolean>;
};

export type PublishResult = {
  manifest: GutenbergManifest;
  manifest_uri: ContentUri;
  release: GutenbergReleaseEvent;
  file_count: number;
  total_bytes: number;
};
