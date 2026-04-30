import { ErrorView } from '@/components/ErrorView';

export function NotFoundRoute() {
  return (
    <ErrorView
      title="Page not found"
      message="The URL doesn't match any known route. Try the lookup form on the home page."
    />
  );
}
