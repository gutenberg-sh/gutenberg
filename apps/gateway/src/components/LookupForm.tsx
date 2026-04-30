import { ExternalLink, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function LookupForm() {
  const navigate = useNavigate();
  const [release_spec, set_release_spec] = useState('');
  const [publisher, set_publisher] = useState('');
  const [manifest_url, set_manifest_url] = useState('');
  const [error, set_error] = useState<string | undefined>();

  const submit_release = (event: FormEvent) => {
    event.preventDefault();
    set_error(undefined);

    const trimmed = release_spec.trim();
    const at = trimmed.indexOf('@');
    const name = at > 0 ? trimmed.slice(0, at) : trimmed;
    const version = at > 0 ? trimmed.slice(at + 1) : undefined;

    if (!NAME_RE.test(name)) {
      set_error(
        'Release name must use lowercase letters, numbers, dots, underscores, or hyphens',
      );
      return;
    }

    const params = new URLSearchParams();
    const trimmed_publisher = publisher.trim();

    if (trimmed_publisher.length > 0) {
      params.set('p', trimmed_publisher);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const path = version
      ? `/r/${encodeURIComponent(name)}/${encodeURIComponent(version)}${query}`
      : `/r/${encodeURIComponent(name)}${query}`;

    void navigate(path);
  };

  const submit_manifest = (event: FormEvent) => {
    event.preventDefault();
    set_error(undefined);

    const trimmed = manifest_url.trim();

    try {
      const url = new URL(trimmed);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        set_error('Manifest URL must be http(s)');
        return;
      }
    } catch {
      set_error('Manifest URL is not a valid URL');
      return;
    }

    const params = new URLSearchParams({ uri: trimmed });
    void navigate(`/m?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open a release</CardTitle>
        <CardDescription>
          Verify a Gutenberg release locally in your browser. Lookup by
          registered <code>name</code> (with optional <code>@version</code>) or
          paste a manifest URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form className="grid gap-3" onSubmit={submit_release}>
          <div className="grid gap-1.5">
            <Label htmlFor="release-spec">Release</Label>
            <Input
              id="release-spec"
              placeholder="my-site or my-site@1.0.0"
              autoComplete="off"
              spellCheck={false}
              value={release_spec}
              onChange={(event) => set_release_spec(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="publisher">Publisher (optional)</Label>
            <Input
              id="publisher"
              placeholder="Solana public key (recommended on public RPCs)"
              autoComplete="off"
              spellCheck={false}
              value={publisher}
              onChange={(event) => set_publisher(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Without a publisher we scan all program accounts via{' '}
              <code>getProgramAccounts</code>. Some public RPCs disable that
              method.
            </p>
          </div>
          <Button type="submit" className="justify-self-start">
            <Search className="size-4" aria-hidden />
            Open release
          </Button>
        </form>

        <Separator />

        <form className="grid gap-3" onSubmit={submit_manifest}>
          <div className="grid gap-1.5">
            <Label htmlFor="manifest-url">Manifest URL</Label>
            <Input
              id="manifest-url"
              placeholder="https://gateway.irys.xyz/<tx-id>"
              autoComplete="off"
              spellCheck={false}
              value={manifest_url}
              onChange={(event) => set_manifest_url(event.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Skips the registry lookup. Signature + bundle hash are still
              verified, but you trust this URL points at the right manifest.
            </p>
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="justify-self-start"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open manifest
          </Button>
        </form>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
