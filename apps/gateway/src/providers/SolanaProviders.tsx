import { SolanaProvider } from '@solana/react-hooks';
import { type ReactNode, useMemo } from 'react';

import { env } from '@/env';

export function SolanaProviders({ children }: { children: ReactNode }) {
  const rpc = useMemo(() => env.VITE_GUTENBERG_SOLANA_RPC_URL, []);

  return (
    <SolanaProvider
      config={{ rpc, walletConnectors: 'default' }}
      walletPersistence={{ autoConnect: true }}
    >
      {children}
    </SolanaProvider>
  );
}
