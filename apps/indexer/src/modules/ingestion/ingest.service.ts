import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import {
  decode_release_events_from_logs,
  type DecodedReleaseEvent,
} from '@gutenberg/core';

import {
  cursorsTable,
  publicationsTable,
  publishersTable,
  releasesTable,
} from '@gutenberg/db';
import {
  ManifestsService,
  PublicationsService,
  PublishersService,
  ReleasesService,
} from '@gutenberg/shared';

import { CursorService } from './cursor.service';
import { RELEASES_CURSOR_SCOPE } from './ingest.types';
import type { IngestableTransaction, IngestionResult } from './ingest.types';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly publishers_service: PublishersService,
    private readonly publications_service: PublicationsService,
    private readonly releases_service: ReleasesService,
    private readonly manifests_service: ManifestsService,
    private readonly cursor_service: CursorService,
  ) {}

  async ingest_transaction(
    input: IngestableTransaction,
  ): Promise<IngestionResult> {
    const events = decode_release_events_from_logs(input.log_messages);

    let releases_indexed = 0;

    for (const event of events) {
      const indexed = await this.index_event({
        event,
        signature: input.signature,
      });

      if (indexed) {
        releases_indexed += 1;
      }
    }

    await this.advance_cursor({
      slot: input.slot,
      signature: input.signature,
    });

    return {
      events_decoded: events.length,
      releases_indexed,
    };
  }

  private async advance_cursor(input: {
    slot: number;
    signature: string;
  }): Promise<void> {
    try {
      const existing = await this.cursor_service.find({
        where: eq(cursorsTable.scope, RELEASES_CURSOR_SCOPE),
      });

      if (!existing) {
        await this.cursor_service.create({
          scope: RELEASES_CURSOR_SCOPE,
          last_signature: input.signature,
          last_slot: input.slot,
          backfill_completed_at: null,
        });
        return;
      }

      if (existing.last_slot != null && existing.last_slot >= input.slot) {
        return;
      }

      await this.cursor_service.update(existing.id, {
        last_signature: input.signature,
        last_slot: input.slot,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to advance cursor to slot ${input.slot}: ${(error as Error).message}`,
      );
    }
  }

  private async index_event(input: {
    event: DecodedReleaseEvent;
    signature: string;
  }): Promise<boolean> {
    const existing_release = await this.releases_service.find({
      where: eq(releasesTable.address, input.event.release_address),
    });

    if (existing_release) {
      return false;
    }

    const publisher = await this.upsert_publisher(input.event.publisher);
    const publication = await this.upsert_publication({
      event: input.event,
      publisher_id: publisher.id,
    });

    const release = await this.releases_service.create({
      publisher_id: publisher.id,
      publication_id: publication.id,
      address: input.event.release_address,
      version: input.event.version,
      schema_version: input.event.schema_version,
      content_hash: input.event.content_hash,
      content_size_bytes: input.event.content_size_bytes,
      signature: input.signature,
      published_at: new Date(input.event.published_at),
    });

    await this.manifests_service.create({
      release_id: release.id,
      uri: input.event.manifest,
      hash: input.event.manifest_hash,
    });

    return true;
  }

  private async upsert_publisher(address: string) {
    const existing = await this.publishers_service.find({
      where: eq(publishersTable.address, address),
    });

    if (existing) {
      return existing;
    }

    return this.publishers_service.create({ address });
  }

  private async upsert_publication(input: {
    event: DecodedReleaseEvent;
    publisher_id: string;
  }) {
    const existing = await this.publications_service.find({
      where: eq(publicationsTable.address, input.event.publication_address),
    });

    if (existing) {
      return existing;
    }

    return this.publications_service.create({
      publisher_id: input.publisher_id,
      address: input.event.publication_address,
      registry_id: input.event.registry_id,
    });
  }
}
