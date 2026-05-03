import { Route, Routes } from 'react-router-dom';

import { FilmGrain } from '@/components/FilmGrain';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { BrowseRoute } from '@/routes/Browse';
import { LandingRoute } from '@/routes/Landing';
import { LatestReleaseRoute } from '@/routes/LatestRelease';
import { LegacyPublicationRedirect } from '@/routes/LegacyPublicationRedirect';
import { LegacyPublisherRedirect } from '@/routes/LegacyPublisherRedirect';
import { NotFoundRoute } from '@/routes/NotFound';
import { PublishRoute } from '@/routes/Publish';
import { PublisherRoute } from '@/routes/Publisher';
import { ReleaseRoute } from '@/routes/Release';
import { SearchRoute } from '@/routes/Search';
import { VersionsRoute } from '@/routes/Versions';

export function App() {
  return (
    <div
      className="relative flex min-h-dvh w-full min-w-0 flex-col bg-transparent"
      data-surface="tactical-telemetry"
    >
      <FilmGrain />
      <SiteHeader />
      <main className="relative flex flex-1 flex-col bg-transparent">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/browse" element={<BrowseRoute />} />
          <Route path="/search" element={<SearchRoute />} />
          <Route path="/publish" element={<PublishRoute />} />
          <Route path="/publisher/:address" element={<PublisherRoute />} />
          <Route path="/p/:address" element={<LegacyPublisherRedirect />} />
          <Route path="/publication/:name" element={<LatestReleaseRoute />} />
          <Route
            path="/publication/:name/versions"
            element={<VersionsRoute />}
          />
          <Route path="/publication/:name/:version" element={<ReleaseRoute />} />
          <Route
            path="/publication/:name/:version/*"
            element={<ReleaseRoute />}
          />
          <Route path="/r" element={<LegacyPublicationRedirect />} />
          <Route path="/r/*" element={<LegacyPublicationRedirect />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}
