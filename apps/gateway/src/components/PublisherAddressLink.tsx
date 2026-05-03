import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { PublisherAvatar } from '@/components/PublisherAvatar';
import { cn } from '@/lib/utils';

export function PublisherAddressLink({
  address,
  avatarSize = 20,
  className,
  onClick,
  children,
}: {
  address: string;
  avatarSize?: number;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <Link
      to={`/publisher/${encodeURIComponent(address)}`}
      onClick={onClick}
      className={cn('inline-flex min-w-0 items-center gap-2', className)}
      title={address}
    >
      <PublisherAvatar
        address={address}
        size={avatarSize}
        className="shrink-0"
      />
      {children}
    </Link>
  );
}
