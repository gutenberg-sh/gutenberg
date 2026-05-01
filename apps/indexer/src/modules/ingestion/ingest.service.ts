import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import {
  decode_release_events_from_logs,
  type DecodedReleaseEvent,
} from '@gutenberg/core';

import {
  namesTable,
  publishersTable,
  releasesTable,
} from '../../common/database/tables';
import { ManifestsService } from '../manifests/manifests.service';
import { NamesService } from '../names/names.service';
import { PublishersService } from '../publishers/publishers.service';
import { ReleasesService } from '../releases/releases.service';

import type {
  IngestableTransaction,
  IngestionResult,
} from './ingest.types';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly publishers_service: PublishersService,
    private readonly names_service: NamesService,
    private readonly releases_service: ReleasesService,
    private readonly manifests_service: ManifestsService,
  ) {}

  async ingest_transaction(
    input: IngestableTransaction,
  ): Promise<IngestionResult> {
    const events = decode_release_events_from_logs(input.log_messages);

    if (events.length === 0) {
      return { events_decoded: 0, releases_indexed: 0 };
    }

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

    return {
      events_decoded: events.length,
      releases_indexed,
    };
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
    const name = await this.upsert_name({
      event: input.event,
      publisher_id: publisher.id,
    });

    const release = await this.releases_service.create({
      publisher_id: publisher.id,
      name_id: name.id,
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

  private async upsert_name(input: {
    event: DecodedReleaseEvent;
    publisher_id: string;
  }) {
    const existing = await this.names_service.find({
      where: eq(namesTable.address, input.event.name_address),
    });

    if (existing) {
      return existing;
    }

    return this.names_service.create({
      publisher_id: input.publisher_id,
      address: input.event.name_address,
      name: input.event.name,
    });
  }
}
