import { useState } from 'react';

const APPLE_PLATFORM_RE = /(Mac|iPhone|iPod|iPad)/i;

export function useIsApplePlatform(): boolean {
  const [is_apple] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      APPLE_PLATFORM_RE.test(navigator.platform),
  );
  return is_apple;
}
