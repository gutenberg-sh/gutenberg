import type { ContentUri, Sha256Hash } from '@gutenberg/core';

import type { GutenbergReleaseEvent } from '../registry/registry.types';

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

export type PublishProgressEvent = {
  kind: 'wallet_connected' | 'upload_started' | 'upload_complete' | 'tx_sent';
  message: string;
};

export type PublishHooks = {
  on_browser_opened?: (url: string) => void;
  on_progress?: (event: PublishProgressEvent) => void;
};

export type PublishResult = {
  manifest_uri: ContentUri;
  manifest_hash: Sha256Hash;
  release: GutenbergReleaseEvent | undefined;
  release_pda: string;
  tx_signature: string;
  publisher: string;
  file_count: number;
  total_bytes: number;
};
