import { ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { GutenbergManifest } from '@/lib/types';

export function ReleaseHeader({
  manifest,
  manifest_uri,
  release_pda,
}: {
  manifest: GutenbergManifest;
  manifest_uri: string;
  release_pda?: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" className="gap-1">
            <ShieldCheck className="size-3.5" aria-hidden />
            Verified release
          </Badge>
          <span className="font-mono text-sm">{manifest.name}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-sm">{manifest.version}</span>
        </div>
        <CardTitle className="text-2xl">
          {manifest.name}{' '}
          <span className="text-muted-foreground">{manifest.version}</span>
        </CardTitle>
        <CardDescription>
          Published {new Date(manifest.created_at).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="grid gap-2 py-4 text-xs text-muted-foreground sm:grid-cols-2">
        <FactRow label="Publisher" value={manifest.publisher} mono />
        <FactRow label="Files" value={`${Object.keys(manifest.files).length}`} />
        <FactRow label="Manifest" value={manifest_uri} mono break_all />
        <FactRow label="Bundle" value={manifest.bundle_uri} mono break_all />
        {release_pda ? (
          <FactRow label="Release PDA" value={release_pda} mono break_all />
        ) : null}
      </CardContent>
    </Card>
  );
}

function FactRow({
  label,
  value,
  mono,
  break_all,
}: {
  label: string;
  value: string;
  mono?: boolean;
  break_all?: boolean;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground/80">
        {label}
      </span>
      <span
        className={
          (mono ? 'font-mono ' : '') +
          (break_all ? 'break-all ' : '') +
          'text-foreground'
        }
      >
        {value}
      </span>
    </div>
  );
}
