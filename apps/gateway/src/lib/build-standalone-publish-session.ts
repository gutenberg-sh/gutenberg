import {
  PUBLISH_SESSION_PROTOCOL_VERSION,
  assert_valid_name,
  type PublishSessionFile,
  type PublishSessionInput,
  infer_chain_id,
} from '@gutenberg/core';

import { env } from '@/env';
import { irys_network_from_bundler_url } from '@/lib/irys-network-from-bundler';

export const STANDALONE_PUBLISH_ENTRY = '/index.md' as const;

export type StandalonePublishMetadata = {
  name: string;
  version: string;
};

export function build_standalone_publish_session(input: {
  metadata: StandalonePublishMetadata;
  files: PublishSessionFile[];
}): PublishSessionInput {
  const { metadata, files } = input;

  if (files.length === 0) {
    throw new Error('Add at least one file before publishing');
  }

  assert_valid_name(metadata.name.trim(), 'Publication name');

  const version = metadata.version.trim();

  if (!version) {
    throw new Error('Version is required');
  }

  const paths = new Set(files.map((f) => f.path));

  if (!paths.has(STANDALONE_PUBLISH_ENTRY)) {
    throw new Error(
      `Your bundle must include ${STANDALONE_PUBLISH_ENTRY} at the root.`,
    );
  }

  return {
    protocol_version: PUBLISH_SESSION_PROTOCOL_VERSION,
    name: metadata.name.trim(),
    version,
    entry: STANDALONE_PUBLISH_ENTRY,
    chain: {
      chain_id: infer_chain_id(env.VITE_GUTENBERG_SOLANA_RPC_URL),
      program_id: env.VITE_GUTENBERG_REGISTRY_PROGRAM_ID,
    },
    rpc_url: env.VITE_GUTENBERG_SOLANA_RPC_URL,
    irys_network: irys_network_from_bundler_url(env.VITE_GUTENBERG_IRYS_GATEWAY),
    files,
  };
}
