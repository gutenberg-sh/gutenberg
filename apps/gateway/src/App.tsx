import { Route, Routes } from 'react-router-dom';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { BrowseRoute } from '@/routes/Browse';
import { LandingRoute } from '@/routes/Landing';
import { LatestReleaseRoute } from '@/routes/LatestRelease';
import { NotFoundRoute } from '@/routes/NotFound';
import { PublishRoute } from '@/routes/Publish';
import { PublisherRoute } from '@/routes/Publisher';
import { ReleaseRoute } from '@/routes/Release';
import { SearchRoute } from '@/routes/Search';
import { VersionsRoute } from '@/routes/Versions';

export function App() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="relative flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/browse" element={<BrowseRoute />} />
          <Route path="/search" element={<SearchRoute />} />
          <Route path="/publish" element={<PublishRoute />} />
          <Route path="/p/:address" element={<PublisherRoute />} />
          <Route path="/r/:name" element={<LatestReleaseRoute />} />
          <Route path="/r/:name/versions" element={<VersionsRoute />} />
          <Route path="/r/:name/:version" element={<ReleaseRoute />} />
          <Route path="/r/:name/:version/*" element={<ReleaseRoute />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}
