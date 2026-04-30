import { Route, Routes } from 'react-router-dom';

import { SiteHeader } from '@/components/SiteHeader';
import { LandingRoute } from '@/routes/Landing';
import { ManifestRoute } from '@/routes/Manifest';
import { NotFoundRoute } from '@/routes/NotFound';
import { ReleaseRoute } from '@/routes/Release';

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:py-12">
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/r/:name" element={<ReleaseRoute />} />
          <Route path="/r/:name/:version" element={<ReleaseRoute />} />
          <Route path="/r/:name/:version/*" element={<ReleaseRoute />} />
          <Route path="/m" element={<ManifestRoute />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground">
          <p>
            Gutenberg gateway · verifies and renders releases recorded on the
            Gutenberg registry.
          </p>
          <p>
            All verification (manifest signature, bundle hash, file hashes)
            happens locally in your browser.
          </p>
        </div>
      </footer>
    </div>
  );
}
