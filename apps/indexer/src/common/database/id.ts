import { nanoid } from 'nanoid';

export type IdPrefix = 'pub' | 'nam' | 'rel' | 'man' | 'cur';

export function create_prefixed_id(prefix: IdPrefix): string {
  return `${prefix}_${nanoid()}`;
}
