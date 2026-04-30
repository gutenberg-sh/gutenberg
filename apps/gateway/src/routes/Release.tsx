import { useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { VerifiedReleaseView } from '@/components/VerifiedReleaseView';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function ReleaseRoute() {
  const params = useParams();
  const name = params.name;
  const version = params.version;
  const splat = params['*'];

  if (!name || !NAME_RE.test(name)) {
    return (
      <ErrorView
        title="Invalid release name"
        message={`"${name ?? ''}" is not a valid release name.`}
      />
    );
  }

  if (!version) {
    return (
      <ErrorView
        title="Missing version"
        message="Releases are addressed as name@version (e.g. gutenberg-demo@1.0.0)."
      />
    );
  }

  const base_path = `/r/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  const current_path: `/${string}` | undefined = splat
    ? `/${splat}`
    : undefined;

  return (
    <VerifiedReleaseView
      key={`${name}@${version}`}
      source={{ name, version }}
      base_path={base_path}
      current_path={current_path}
    />
  );
}
