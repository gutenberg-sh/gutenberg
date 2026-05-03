import type { ChainId, ContentUri, Sha256Hash } from './types.js';

export const PUBLISH_SESSION_PROTOCOL_VERSION = 1 as const;

export type PublishSessionFile = {
  path: `/${string}`;
  size_bytes: number;
  mime?: string;
  content_base64: string;
};

export type PublishSessionInput = {
  protocol_version: typeof PUBLISH_SESSION_PROTOCOL_VERSION;
  registry_id: string;
  version: string;
  entry: `/${string}`;
  prev_version?: string;
  license?: string;
  language?: string;
  chain: {
    chain_id: ChainId;
    program_id: string;
  };
  rpc_url: string;
  irys_network: 'mainnet' | 'devnet';
  files: PublishSessionFile[];
};

export type PublishSessionResult = {
  protocol_version: typeof PUBLISH_SESSION_PROTOCOL_VERSION;
  manifest_uri: ContentUri;
  manifest_hash: Sha256Hash;
  content_hash: Sha256Hash;
  content_size_bytes: number;
  release_address: string;
  signature: string;
  publisher: string;
};

export type PublishSessionProgress = {
  protocol_version: typeof PUBLISH_SESSION_PROTOCOL_VERSION;
  kind: 'wallet_connected' | 'upload_started' | 'upload_complete' | 'tx_sent';
  message: string;
  meta?: Record<string, string | number | boolean>;
};

export type PublishSessionError = {
  protocol_version: typeof PUBLISH_SESSION_PROTOCOL_VERSION;
  kind: 'cancelled' | 'failed';
  message: string;
};
