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
  license?: string;
  language?: string;
  tags?: string[];
  prev_version?: string;
};

export type PublishCostPreview = {
  files_bytes: number;
  manifest_bytes: number;
  total_bytes: number;
  file_count: number;
  cost: UploadCostEstimate;
};

export type FileUploadEvent = {
  index: number;
  total: number;
  site_path: `/${string}`;
  size_bytes: number;
};

export type PublishHooks = {
  confirm_cost?: (preview: PublishCostPreview) => Promise<boolean>;
  on_file_uploaded?: (event: FileUploadEvent) => void;
};

export type PublishResult = {
  manifest: GutenbergManifest;
  manifest_uri: ContentUri;
  release: GutenbergReleaseEvent;
  release_pda: string;
  file_count: number;
  total_bytes: number;
};
