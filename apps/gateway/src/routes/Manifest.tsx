import { useSearchParams } from 'react-router-dom';

import { ErrorView } from '@/components/ErrorView';
import { VerifiedReleaseView } from '@/components/VerifiedReleaseView';

export function ManifestRoute() {
  const [search] = useSearchParams();
  const manifest_uri = search.get('uri');

  if (!manifest_uri) {
    return (
      <ErrorView
        title="Missing manifest URI"
        message="Append ?uri=<manifest URL> to /m to verify a manifest directly."
      />
    );
  }

  try {
    const url = new URL(manifest_uri);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('only http(s) is allowed');
    }
  } catch (err) {
    return (
      <ErrorView
        title="Invalid manifest URI"
        message={err instanceof Error ? err.message : String(err)}
      />
    );
  }

  return (
    <VerifiedReleaseView
      key={`manifest:${manifest_uri}`}
      source={{ kind: 'manifest', manifest_uri }}
      base_path="/m"
    />
  );
}
