import type { ContentUri } from '../manifest/manifest.types';

export type ContentStore = {
  put_blob(data: Buffer | string): Promise<ContentUri>;
  put_manifest(data: Buffer | string): Promise<ContentUri>;
  get_blob(uri: ContentUri): Promise<Buffer>;
};
