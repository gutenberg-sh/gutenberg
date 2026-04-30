import { Route, Routes } from 'react-router-dom';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { LandingRoute } from '@/routes/Landing';
import { LatestReleaseRoute } from '@/routes/LatestRelease';
import { NotFoundRoute } from '@/routes/NotFound';
import { ReleaseRoute } from '@/routes/Release';

export function App() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="relative flex flex-1 flex-col">
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
