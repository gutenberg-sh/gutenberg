import { useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { VerifiedReleaseView } from '@/components/VerifiedReleaseView';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function ReleaseRoute() {
  const params = useParams();
  const name = params.name;
  const version = params.version;
  const splat = params['*'];

  if (!name || !NAME_RE.test(name)) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Invalid release name"
          message={`"${name ?? ''}" is not a valid release name.`}
        />
      </Container>
    );
  }

  if (!version) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Missing version"
          message="Releases are addressed as name@version (e.g. gutenberg-demo@1.0.0)."
        />
      </Container>
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
