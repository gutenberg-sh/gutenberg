import { Navigate, useSearchParams } from 'react-router-dom';

/** Keeps old `/search?q=` links working after browse/search merge. */
export function SearchRedirect() {
  const [params] = useSearchParams();
  const search = params.toString();
  return (
    <Navigate
      to={{ pathname: '/browse', search: search ? `?${search}` : '' }}
      replace
    />
  );
}
