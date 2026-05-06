import {
  GUTENBERG_REGISTRY_PROGRAM_ID,
  PUBLISH_SESSION_PROTOCOL_VERSION,
  assert_valid_registry_id,
  infer_chain_id,
  type PublishSessionFile,
  type PublishSessionInput,
} from '@gutenberg/core';

import { env } from '@/env';

const STANDALONE_PUBLISH_ENTRY = '/index.md' as const;

type StandalonePublishMetadata = {
  registry_id: string;
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

  assert_valid_registry_id(
    metadata.registry_id.trim(),
    'Publication id (registry id)',
  );

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
    registry_id: metadata.registry_id.trim(),
    version,
    entry: STANDALONE_PUBLISH_ENTRY,
    chain: {
      chain_id: infer_chain_id(env.VITE_GUTENBERG_SOLANA_RPC_URL),
      program_id: GUTENBERG_REGISTRY_PROGRAM_ID,
    },
    rpc_url: env.VITE_GUTENBERG_SOLANA_RPC_URL,
    irys_network: env.VITE_GUTENBERG_IRYS_NETWORK,
    files,
  };
}
