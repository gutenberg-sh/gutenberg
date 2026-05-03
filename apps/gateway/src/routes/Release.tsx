import { REGISTRY_ID_RE } from '@gutenberg/core';
import { useParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { Container } from '@/components/Layout';
import { VerifiedReleaseView } from '@/components/VerifiedReleaseView';

export function ReleaseRoute() {
  const params = useParams();
  const registry_id = params.registry_id;
  const version = params.version;
  const splat = params['*'];

  if (!registry_id || !REGISTRY_ID_RE.test(registry_id)) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="That registry id doesn't look right"
          message={`"${registry_id ?? ''}" isn't a valid registry id. Use lowercase letters, numbers, dots, underscores, or hyphens.`}
        />
      </Container>
    );
  }

  if (!version) {
    return (
      <Container className="py-20 lg:py-28">
        <ErrorView
          title="Missing the version"
          message="Use registry_id@version (e.g. gutenberg-demo@1.0.0)."
        />
      </Container>
    );
  }

  const base_path = `/publication/${encodeURIComponent(registry_id)}/${encodeURIComponent(version)}`;
  const current_path: `/${string}` | undefined = splat
    ? `/${splat}`
    : undefined;

  return (
    <VerifiedReleaseView
      key={`${registry_id}@${version}`}
      source={{ registry_id, version }}
      base_path={base_path}
      current_path={current_path}
    />
  );
}
