import { Route, Routes } from 'react-router-dom';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { LandingRoute } from '@/routes/Landing';
import { LatestReleaseRoute } from '@/routes/LatestRelease';
import { NotFoundRoute } from '@/routes/NotFound';
import { ReleaseRoute } from '@/routes/Release';

export function App() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <span aria-hidden className="grain" />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-10 sm:pt-14 lg:px-10">
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/r/:name" element={<LatestReleaseRoute />} />
          <Route path="/r/:name/:version" element={<ReleaseRoute />} />
          <Route path="/r/:name/:version/*" element={<ReleaseRoute />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}
