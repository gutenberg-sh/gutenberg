import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { PublisherAvatar } from '@/components/PublisherAvatar';
import { PublisherTip } from '@/components/PublisherTip';
import {
  RegistryPageLayout,
  RegistryPageTitle,
} from '@/components/RegistryPageLayout';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/Pagination';
import {
  PublicationFeedFooter,
  PublicationFeedSection,
} from '@/components/PublicationFeedSection';
import { PublicationList, ReleaseRow } from '@/components/ReleaseRow';
import { api_error_message } from '@/lib/api';
import { is_valid_publisher_address } from '@/lib/ed25519';
import { explorer_address_url } from '@/lib/explorer';
import { format_date_short } from '@/lib/format';
import { usePublisher, usePublisherReleases } from '@/lib/queries';
import {
  registry_card_inset,
  registry_empty_simple,
  registry_feed_x,
  registry_feed_y_gutter,
} from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

export function PublisherRoute() {
  const params = useParams();
  const address = params.address;
  const [page, set_page] = useState(0);

  const publisher = usePublisher(address);
  const releases = usePublisherReleases(address, {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    includes: 'publisher,publication',
  });

  if (!address) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Missing publisher address"
          message={
            'Publisher pages live at /publisher/<address>. Add the public key to the URL and try again.'
          }
          back_to="/browse"
        />
      </Container>
    );
  }

  if (!is_valid_publisher_address(address)) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Invalid Solana address"
          message={
            'Use a base58-encoded public key (32 bytes), for example from your wallet. Publisher pages use /publisher/ followed by that key in the URL.'
          }
          back_to="/browse"
        />
      </Container>
    );
  }

  const list = releases.data ?? [];
  const has_next = list.length === PAGE_SIZE;
  const range_start = page * PAGE_SIZE + 1;
  const range_end = page * PAGE_SIZE + list.length;
  return (
    <RegistryPageLayout
      eyebrow="Publisher"
      title={
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <PublisherAvatar address={address} size={64} className="shrink-0" />
          <div className="grid min-w-0 gap-1.5">
            <RegistryPageTitle>Anonymous</RegistryPageTitle>
            <p
              className="break-all font-mono text-[13px] tabular leading-normal text-foreground-soft sm:text-[14px]"
              title={address}
            >
              {address}
            </p>
          </div>
        </div>
      }
      description={
        <>
          {publisher.isLoading ? (
            <div
              className="h-4 max-w-xs animate-pulse rounded-lg bg-muted/70"
              aria-hidden
            />
          ) : publisher.data ? (
            <p>
              First seen{' '}
              <span className="font-mono tabular text-foreground">
                {format_date_short(publisher.data.created_at)}
              </span>
              .
            </p>
          ) : null}
          <p>
            The publisher is fully anonymous: no profile or display name, only
            this public address.
          </p>
        </>
      }
      headerAside={
        <>
          <PublisherTip recipient_address={address} />
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5 px-2.5 py-1.5 text-[12px] text-foreground-soft hover:border-border-strong hover:text-foreground"
          >
            <a
              href={explorer_address_url(address)}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink
                className="size-3.5"
                strokeWidth={1.85}
                aria-hidden
              />
              Explorer
            </a>
          </Button>
        </>
      }
    >
      <PublicationFeedSection
        aria-label="Publications"
        loading={releases.isLoading}
        skeleton_rows={6}
        footer={
          <PublicationFeedFooter
            summary={
              releases.isLoading ? (
                'Loading publications…'
              ) : releases.isError ? (
                "Couldn't load publications."
              ) : list.length === 0 ? (
                'No publications on this page.'
              ) : (
                <>
                  Showing{' '}
                  <span className="text-foreground-soft">
                    {range_start}–{range_end}
                  </span>
                  {has_next
                    ? ' · more on the next page'
                    : page > 0
                      ? ' · end of list'
                      : null}
                </>
              )
            }
          >
            <Pagination
              page={page + 1}
              has_prev={page > 0 && !releases.isLoading && !releases.isError}
              has_next={has_next && !releases.isLoading && !releases.isError}
              loading={releases.isFetching}
              on_prev={() => set_page((p) => Math.max(0, p - 1))}
              on_next={() => set_page((p) => p + 1)}
              with_top_border={false}
            />
          </PublicationFeedFooter>
        }
      >
        {releases.isError ? (
          <div className={registry_card_inset}>
            <ErrorView
              title="Couldn't load this publisher's publications"
              message={api_error_message(
                releases.error,
                "We can't reach the indexer right now. Try again in a moment.",
              )}
              back_to="/browse"
            />
          </div>
        ) : list.length === 0 ? (
          <div className={cn(registry_feed_x, registry_feed_y_gutter)}>
            <div className={registry_empty_simple}>
              <p className="text-[14px] text-foreground">
                No publications from this address.
              </p>
              <p className="max-w-[40ch] text-[12.5px] leading-[1.65] text-muted-foreground">
                When this publisher signs a release, it will show up here.
              </p>
            </div>
          </div>
        ) : (
          <PublicationList>
            {list.map((r) => (
              <ReleaseRow key={r.id} release={r} />
            ))}
          </PublicationList>
        )}
      </PublicationFeedSection>
    </RegistryPageLayout>
  );
}
