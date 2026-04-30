import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { VerifiedReleaseView } from '@/components/VerifiedReleaseView';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function ReleaseRoute() {
  const params = useParams();
  const [search] = useSearchParams();

  const name = params.name;
  const version = params.version;
  const splat = params['*'];
  const publisher = search.get('p') ?? undefined;

  const source_key = useMemo(
    () => `release:${name ?? ''}@${version ?? ''}|${publisher ?? ''}`,
    [name, version, publisher],
  );

  if (!name || !NAME_RE.test(name)) {
    return (
      <ErrorView
        title="Invalid release name"
        message={`"${name ?? ''}" is not a valid release name.`}
      />
    );
  }

  const base_path = version
    ? `/r/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
    : `/r/${encodeURIComponent(name)}`;

  const current_path: `/${string}` | undefined = splat
    ? `/${splat}`
    : undefined;

  return (
    <VerifiedReleaseView
      key={source_key}
      source={{
        kind: 'release',
        name,
        version: version || undefined,
        publisher,
      }}
      base_path={base_path}
      current_path={current_path}
    />
  );
}
