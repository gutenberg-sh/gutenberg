import { useWalletConnection, useWalletModalState } from '@solana/react-hooks';
import type { ComponentProps, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { overlay_panel, overlay_scrim } from '@/lib/overlay-surface';
import { shorten } from '@/lib/format';
import { cn } from '@/lib/utils';

type ConnectWalletButtonProps = {
  style?: CSSProperties;
  className?: string;
  variant?: ComponentProps<typeof Button>['variant'];
};

export function ConnectWalletButton({
  style,
  className,
  variant = 'default',
}: ConnectWalletButtonProps) {
  const { isReady, connected, connectors, connecting, disconnect, wallet } =
    useWalletConnection();
  const modal = useWalletModalState({ closeOnConnect: true });

  if (!isReady) {
    return (
      <Button
        type="button"
        variant={variant}
        className={cn('opacity-60', className)}
        style={style}
        disabled
      >
        Wallets…
      </Button>
    );
  }

  if (connected && wallet) {
    const label = shorten(wallet.account.address.toString(), 4, 4);
    return (
      <Button
        type="button"
        variant={variant}
        className={className}
        style={style}
        onClick={() => void disconnect()}
        title={wallet.account.address.toString()}
      >
        {label}
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        style={style}
        onClick={modal.open}
        disabled={connecting}
      >
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </Button>
      {modal.isOpen
        ? createPortal(
            <div
              className={cn(overlay_scrim, 'z-60')}
              role="presentation"
              onClick={() => modal.close()}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Choose wallet"
                className={cn(
                  overlay_panel,
                  'p-4 sm:max-h-[min(80dvh,420px)]',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
                  Choose wallet
                </p>
                <ul className="grid max-h-[50dvh] gap-1 overflow-y-auto sm:max-h-[min(60dvh,360px)]">
                  {connectors.map((c) => (
                    <li key={c.id}>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-h-10 w-full justify-start border-border bg-background px-3 py-2.5 text-left text-[13px] font-medium hover:bg-surface/60"
                        disabled={modal.status === 'connecting'}
                        onClick={() => void modal.connect(c.id)}
                      >
                        {c.icon ? (
                          <img
                            src={c.icon}
                            alt=""
                            className="size-6 shrink-0 rounded-lg"
                            width={24}
                            height={24}
                          />
                        ) : null}
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full border-border bg-muted/30 py-2 text-[12px] font-medium text-muted-foreground hover:bg-muted/50"
                  onClick={() => modal.close()}
                >
                  Cancel
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
