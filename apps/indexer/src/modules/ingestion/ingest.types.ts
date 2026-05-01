export interface IngestableTransaction {
  signature: string;
  slot: number;
  log_messages: string[];
}

export interface IngestionResult {
  events_decoded: number;
  releases_indexed: number;
}

export const RELEASES_CURSOR_SCOPE = 'releases';
