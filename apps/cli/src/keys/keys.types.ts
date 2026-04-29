import type { KeyObject } from 'node:crypto';

import type { SolanaPublicKey } from '../manifest/manifest.types';

export type PublisherKeypair = {
  private_key: KeyObject;
  public_key: KeyObject;
  publisher: SolanaPublicKey;
};
