import { Navigate, useLocation } from 'react-router-dom';

/** Maps `/r/...` URLs to `/publication/...` for bookmarks and external links. */
export function LegacyPublicationRedirect() {
  const { pathname, search, hash } = useLocation();
  const next = pathname.replace(/^\/r(?=\/|$)/, '/publication');
  return <Navigate to={`${next}${search}${hash}`} replace />;
}
