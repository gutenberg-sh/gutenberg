import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Check, Coins, ExternalLink, Loader2, Wallet, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

import { PublisherAvatar } from '@/components/PublisherAvatar';
import { Button } from '@/components/ui/button';
import { explorer_transaction_url } from '@/lib/explorer';
import { shorten } from '@/lib/format';
import { cn } from '@/lib/utils';

const wallet_button_style: CSSProperties = {
  background: 'var(--foreground)',
  color: 'var(--background)',
  borderRadius: '0.5rem',
  height: '2.5rem',
  padding: '0 0.875rem',
  fontSize: '13px',
  fontFamily: 'inherit',
  fontWeight: 600,
};

const PRESET_SOL_LABELS = ['0.01', '0.05', '0.1', '0.25', '0.5', '1'] as const;

const LAMPORTS_PER_SOL_BI = 1_000_000_000n;

const chip_focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const chip_pressable =
  'cursor-pointer transition-[color,border-color,background-color,transform] duration-200 ease-out hover:border-border-strong hover:bg-surface/50 hover:text-foreground active:translate-y-px';

function parse_sol_input(
  raw: string,
): { ok: true; lamports: bigint } | { ok: false; error: string } {
  const normalized = raw.trim().replace(/,/g, '');
  if (normalized === '' || !/^\d+(\.\d{0,9})?$/.test(normalized)) {
    return { ok: false, error: 'Enter a valid amount.' };
  }

  const segments = normalized.split('.');
  const whole_part = segments[0] ?? '';
  const frac_part = segments[1] ?? '';
  const frac_padded = `${frac_part}000000000`.slice(0, 9);
  const lamports =
    BigInt(whole_part) * LAMPORTS_PER_SOL_BI + BigInt(frac_padded);

  if (lamports < 1n) {
    return { ok: false, error: 'Amount must be greater than zero.' };
  }

  const max_reasonable = 1_000_000n * LAMPORTS_PER_SOL_BI;
  if (lamports > max_reasonable) {
    return { ok: false, error: 'Amount is too large.' };
  }

  return { ok: true, lamports };
}

function format_lamports_display(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL_BI;
  const frac = lamports % LAMPORTS_PER_SOL_BI;
  if (frac === 0n) return whole.toString();
  const frac_str = frac.toString().padStart(9, '0').replace(/0+$/, '');
  return `${whole}.${frac_str}`;
}

export function PublisherTip({
  recipient_address,
}: {
  recipient_address: string;
}) {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction, wallet } = useWallet();

  const [open, set_open] = useState(false);
  const [amount_input, set_amount_input] = useState('0.05');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<string | null>(null);
  const [last_signature, set_last_signature] = useState<string | null>(null);
  const [sent_amount_label, set_sent_amount_label] = useState<string | null>(
    null,
  );

  const is_self = connected && publicKey?.toBase58() === recipient_address;

  const amount_parsed = useMemo(
    () => parse_sol_input(amount_input),
    [amount_input],
  );
  const can_send =
    connected &&
    !is_self &&
    amount_parsed.ok &&
    !busy &&
    last_signature === null;

  const try_close_dialog = useCallback(() => {
    if (busy) return;
    set_open(false);
    set_error(null);
    set_last_signature(null);
    set_sent_amount_label(null);
    set_busy(false);
  }, [busy]);

  const open_dialog = useCallback(() => {
    set_error(null);
    set_last_signature(null);
    set_sent_amount_label(null);
    set_busy(false);
    set_amount_input('0.05');
    set_open(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function on_key(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        try_close_dialog();
      }
    }

    window.addEventListener('keydown', on_key);
    return () => {
      document.body.style.overflow = previous_overflow;
      window.removeEventListener('keydown', on_key);
    };
  }, [open, try_close_dialog]);

  async function submit_send() {
    if (!publicKey || !sendTransaction) {
      set_error('Connect a wallet that can send transactions.');
      return;
    }

    if (publicKey.toBase58() === recipient_address) {
      set_error('You cannot tip your own wallet.');
      return;
    }

    const parsed = parse_sol_input(amount_input);
    if (!parsed.ok) {
      set_error(parsed.error);
      return;
    }

    set_error(null);
    set_last_signature(null);
    set_busy(true);

    try {
      const recipient = new PublicKey(recipient_address);
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const tx = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipient,
          lamports: parsed.lamports,
        }),
      );

      const signature = await sendTransaction(tx, connection, {
        skipPreflight: false,
      });

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed',
      );

      set_sent_amount_label(format_lamports_display(parsed.lamports));
      set_last_signature(signature);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      set_error(message || 'Something went wrong. Try again.');
    } finally {
      set_busy(false);
    }
  }

  const tx_href = last_signature
    ? explorer_transaction_url(last_signature)
    : undefined;
  const wallet_label = wallet?.adapter?.name ?? 'Wallet';
  const from_short = publicKey ? shorten(publicKey.toBase58(), 4, 4) : null;

  const show_success = last_signature !== null && sent_amount_label !== null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={open_dialog}
        className={cn(
          'gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-foreground-soft',
          chip_pressable,
          chip_focus,
        )}
      >
        <Coins className="size-3.5" strokeWidth={1.85} aria-hidden />
        Tip publisher
      </Button>

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="publisher-tip-title"
              className="fixed inset-0 z-60 flex items-end justify-center bg-background/88 p-0 sm:items-center sm:p-4"
              onClick={() => try_close_dialog()}
            >
              <div
                className="relative flex max-h-[min(88dvh,520px)] w-full max-w-[380px] flex-col border-2 border-border bg-card shadow-[0_24px_48px_-24px_rgba(0,0,0,0.35)] sm:max-h-[85dvh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2 sm:px-4">
                  <h2
                    id="publisher-tip-title"
                    className="text-[14px] font-semibold tracking-tight text-foreground"
                  >
                    {show_success ? 'Payment sent' : 'Send SOL'}
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Close"
                    disabled={busy}
                    className="shrink-0 rounded-none border-border text-muted-foreground hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                    onClick={() => try_close_dialog()}
                  >
                    <X className="size-4" strokeWidth={1.75} aria-hidden />
                  </Button>
                </div>

                <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {busy ? (
                    <div
                      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/80 px-4"
                      aria-live="polite"
                      aria-busy
                    >
                      <Loader2
                        className="size-7 animate-spin text-foreground"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <p className="text-center text-[12px] font-medium text-foreground">
                        Confirm in your wallet
                      </p>
                    </div>
                  ) : null}

                  {show_success ? (
                    <div className="grid gap-5 px-3 py-6 sm:px-4">
                      <div className="grid place-items-center gap-3">
                        <div className="grid size-12 place-items-center rounded-full border-2 border-accent/40 bg-accent/10">
                          <Check
                            className="size-6 text-accent"
                            strokeWidth={2}
                            aria-hidden
                          />
                        </div>
                        <div className="text-center">
                          <p className="font-mono text-[1.85rem] font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-[2rem]">
                            {sent_amount_label}
                            <span className="ml-1 align-baseline text-[0.95rem] font-medium text-muted-foreground">
                              SOL
                            </span>
                          </p>
                          <p className="mt-2 text-[12px] text-muted-foreground">
                            To{' '}
                            <span className="font-mono text-foreground-soft">
                              {shorten(recipient_address, 6, 6)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Button
                          type="button"
                          size="lg"
                          className="h-10 w-full text-[14px] font-semibold"
                          onClick={() => try_close_dialog()}
                        >
                          Done
                        </Button>
                        {tx_href ? (
                          <Button
                            variant="outline"
                            className={cn(
                              'h-9 w-full gap-2 text-[12px] font-medium text-foreground-soft',
                              chip_pressable,
                              chip_focus,
                            )}
                            asChild
                          >
                            <a
                              href={tx_href}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              <ExternalLink
                                className="size-3.5"
                                strokeWidth={1.85}
                                aria-hidden
                              />
                              View on explorer
                            </a>
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto py-1 font-mono text-[11px] text-muted-foreground"
                          onClick={() =>
                            void navigator.clipboard.writeText(last_signature)
                          }
                        >
                          Copy transaction ID
                        </Button>
                      </div>
                    </div>
                  ) : !connected ? (
                    <div className="grid gap-4 px-3 py-6 text-center sm:px-4">
                      <p className="text-[13px] font-medium text-foreground">
                        Connect a wallet to send SOL.
                      </p>
                      <div className="flex justify-center">
                        <WalletMultiButton style={wallet_button_style} />
                      </div>
                    </div>
                  ) : is_self ? (
                    <div className="px-3 py-6 text-center sm:px-4">
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {
                          "This profile is your connected wallet; you can't tip yourself."
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-0 px-3 pb-4 pt-3 sm:px-4">
                      <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
                        <PublisherAvatar
                          address={recipient_address}
                          size={40}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                            To
                          </p>
                          <p
                            className="truncate font-mono text-[12px] text-foreground-soft"
                            title={recipient_address}
                          >
                            {shorten(recipient_address, 10, 10)}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3 rounded-none border border-border bg-muted/25 px-3 py-4">
                        <label
                          htmlFor="publisher-tip-amount"
                          className="sr-only"
                        >
                          Amount in SOL
                        </label>
                        <div className="flex flex-wrap items-baseline justify-center gap-x-1">
                          <input
                            id="publisher-tip-amount"
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={amount_input}
                            onChange={(e) => {
                              set_error(null);
                              set_amount_input(e.target.value);
                            }}
                            disabled={busy}
                            className="min-w-0 max-w-[10ch] border-0 bg-transparent text-center font-mono text-[2.1rem] font-semibold leading-none tracking-tight text-foreground tabular-nums outline-none ring-0 placeholder:text-muted-foreground/40 focus:ring-0 sm:text-[2.25rem]"
                            placeholder="0.00"
                          />
                          <span className="font-mono text-[0.9rem] font-medium text-muted-foreground">
                            SOL
                          </span>
                        </div>
                        {error ? (
                          <p
                            className="mt-2 text-center text-[12px] text-destructive"
                            role="alert"
                          >
                            {error}
                          </p>
                        ) : null}
                      </div>

                      <div className="mb-3">
                        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                          Suggested
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {PRESET_SOL_LABELS.map((label) => {
                            const active = amount_input.trim() === label;
                            return (
                              <Button
                                key={label}
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                  set_error(null);
                                  set_amount_input(label);
                                }}
                                className={cn(
                                  'min-h-9 rounded-none px-1.5 py-2 font-mono text-[13px] font-semibold tabular-nums transition-[border-color,background-color,color,transform] duration-200 ease-out',
                                  'hover:border-border-strong hover:bg-surface/50 active:translate-y-px',
                                  chip_focus,
                                  active
                                    ? 'border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background'
                                    : 'border-border bg-background text-foreground',
                                )}
                              >
                                {label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mb-1 flex items-center gap-2.5 rounded-none border border-border bg-surface/30 px-2.5 py-2">
                        <Wallet
                          className="size-3.5 shrink-0 text-muted-foreground"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                            From
                          </p>
                          <p className="truncate font-mono text-[11px] text-foreground-soft">
                            {wallet_label}
                            {from_short ? (
                              <span className="text-muted-foreground">
                                {' '}
                                · {from_short}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!show_success && connected && !is_self ? (
                  <div className="border-t border-border bg-card p-3 sm:px-4">
                    <Button
                      type="button"
                      size="lg"
                      disabled={!can_send}
                      className="h-10 w-full text-[14px] font-semibold"
                      onClick={() => void submit_send()}
                    >
                      Send{' '}
                      {amount_parsed.ok
                        ? `${format_lamports_display(amount_parsed.lamports)} SOL`
                        : 'SOL'}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
