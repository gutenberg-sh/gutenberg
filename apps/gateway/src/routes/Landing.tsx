import { Link } from 'react-router-dom';

import { LookupForm } from '@/components/LookupForm';
import { Card, CardContent } from '@/components/ui/card';

export function LandingRoute() {
  return (
    <div className="grid gap-8">
      <section className="grid gap-3 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Gutenberg gateway
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Verified releases, rendered locally.
        </h1>
        <p className="text-muted-foreground sm:max-w-2xl">
          Open any release recorded on the Gutenberg registry. Your browser
          fetches the manifest and bundle, recomputes every hash, and verifies
          the publisher&apos;s Ed25519 signature before showing you a single
          byte.
        </p>
      </section>

      <LookupForm />

      <Card>
        <CardContent className="grid gap-3 py-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Examples</p>
          <ul className="grid gap-1 font-mono text-xs">
            <li>
              <Link
                to="/r/gutenberg-demo/1.0.0"
                className="text-foreground hover:underline"
              >
                /r/gutenberg-demo/1.0.0
              </Link>
            </li>
            <li>
              <Link
                to="/r/gutenberg-demo"
                className="text-foreground hover:underline"
              >
                /r/gutenberg-demo
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
