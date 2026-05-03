import Avatar from 'boring-avatars';
import { useLayoutEffect, useState } from 'react';

import { publisher_avatar_palette } from '@/lib/publisher-avatar-palette';
import { cn } from '@/lib/utils';

const FALLBACK_PRIMARY = '#5b21b6';

/**
 * Deterministic marble avatar from the publisher signing key.
 * Palette follows `--primary` within a purple-only ramp (no neutral black/white).
 * @see https://boringavatars.com/
 */
export function PublisherAvatar({
  address,
  size = 96,
  className,
}: {
  address: string;
  size?: number;
  className?: string;
}) {
  const [colors, set_colors] = useState<string[]>(() =>
    publisher_avatar_palette(FALLBACK_PRIMARY),
  );

  useLayoutEffect(() => {
    const sync = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim();
      if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(raw)) {
        set_colors((prev) => {
          const next = publisher_avatar_palette(raw);
          return prev.join(',') === next.join(',') ? prev : next;
        });
      }
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-pref-refresh'],
    });
    return () => mo.disconnect();
  }, []);

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden bg-elevated ring-1 ring-border',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Avatar
        name={address}
        variant="marble"
        square
        size={size}
        colors={colors}
      />
    </div>
  );
}
