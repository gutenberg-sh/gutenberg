import type { KeyObject } from 'node:crypto';

import type { SolanaPublicKey } from '../../common/types/manifest.types';

export type PublisherKeypair = {
  private_key: KeyObject;
  public_key: KeyObject;
  publisher: SolanaPublicKey;
};
