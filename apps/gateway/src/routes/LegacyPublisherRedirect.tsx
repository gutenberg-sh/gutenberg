import { Navigate, useLocation, useParams } from 'react-router-dom';

/** Maps `/p/<address>` to `/publisher/<address>` for bookmarks and external links. */
export function LegacyPublisherRedirect() {
  const { address } = useParams();
  const { search, hash } = useLocation();

  if (address === undefined || address === '') {
    return <Navigate to="/browse" replace />;
  }

  return (
    <Navigate
      to={`/publisher/${encodeURIComponent(address)}${search}${hash}`}
      replace
    />
  );
}
