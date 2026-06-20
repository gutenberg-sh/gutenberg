import type { PublishSessionFile } from '@gutenberg/core';
import { Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PublishFlowPanel } from '@/components/publish/PublishFlowPanel';
import {
  RegistryPageLayout,
  RegistryPageTitle,
} from '@/components/RegistryPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { build_standalone_publish_session } from '@/lib/build-standalone-publish-session';
import { format_bytes } from '@/lib/format';
import {
  collect_bundle_from_drop,
  is_zip_file,
} from '@/lib/collect-bundle-from-drop';
import { pack_browser_file_selection, pack_zip_file } from '@/lib/pack-files-for-publish';
import {
  registry_feed_column_header_typography,
  registry_feed_field_input,
  registry_feed_publish_header_grid,
  registry_feed_shell,
  registry_feed_x,
} from '@/lib/registry-surface';
import { cn } from '@/lib/utils';

const BUNDLE_SOURCE_HINT =
  'Drop a project folder, loose files, or a .zip — or browse for files or a zip. Folders keep paths when dragged from your desktop; nothing uploads until you sign.';

export function PublishWorkspace() {
  const [search_params] = useSearchParams();
  const [raw_files, set_raw_files] = useState<File[]>([]);
  const [relative_paths, set_relative_paths] = useState<Map<
    File,
    string
  > | null>(null);
  const [zip_file, set_zip_file] = useState<File | null>(null);
  const [packed_files, set_packed_files] = useState<
    PublishSessionFile[] | null
  >(null);
  const [pack_error, set_pack_error] = useState<string | null>(null);
  const [unpack_busy, set_unpack_busy] = useState(false);
  const [drag_active, set_drag_active] = useState(false);

  const bundle_input_ref = useRef<HTMLInputElement>(null);

  const [registry_id, set_registry_id] = useState(
    () => search_params.get('registry_id') ?? '',
  );
  const [version, set_version] = useState(
    () => search_params.get('version') ?? '',
  );

  const reset_sources = useCallback(() => {
    set_raw_files([]);
    set_relative_paths(null);
    set_zip_file(null);
    set_packed_files(null);
    set_pack_error(null);
    set_unpack_busy(false);
  }, []);

  const file_fingerprint = useMemo(
    () =>
      raw_files
        .map(
          (f) =>
            `${f.name}\0${f.size}\0${f.lastModified}\0${f.webkitRelativePath ?? ''}`,
        )
        .join('\n'),
    [raw_files],
  );

  useEffect(() => {
    if (zip_file) {
      return;
    }

    if (raw_files.length === 0) {
      queueMicrotask(() => {
        set_packed_files(null);
        set_pack_error(null);
      });
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const packed = await pack_browser_file_selection({
          files: raw_files,
          relative_paths: relative_paths ?? undefined,
        });

        if (cancelled) {
          return;
        }

        if (packed.length === 0) {
          set_packed_files(null);
          set_pack_error(
            'Every path was skipped (hidden files only). Choose different files or a folder.',
          );
          return;
        }

        set_packed_files(packed);
        set_pack_error(null);
      } catch (error) {
        if (!cancelled) {
          set_packed_files(null);
          set_pack_error(
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [zip_file, raw_files, file_fingerprint, relative_paths]);

  const zip_fingerprint = zip_file
    ? `${zip_file.name}\0${zip_file.size}\0${zip_file.lastModified}`
    : '';

  useEffect(() => {
    if (!zip_file) {
      return;
    }

    let cancelled = false;

    void (async () => {
      set_unpack_busy(true);
      set_pack_error(null);

      try {
        const packed = await pack_zip_file(zip_file);

        if (cancelled) {
          return;
        }

        set_packed_files(packed);
        set_pack_error(null);
      } catch (error: unknown) {
        if (!cancelled) {
          set_packed_files(null);
          set_pack_error(
            error instanceof Error ? error.message : String(error),
          );
        }
      } finally {
        if (!cancelled) {
          set_unpack_busy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [zip_file, zip_fingerprint]);

  const on_pick_bundle = useCallback(() => {
    bundle_input_ref.current?.click();
  }, []);

  const on_bundle_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? [...e.target.files] : [];
      e.target.value = '';
      set_pack_error(null);

      if (list.length === 0) {
        return;
      }

      if (list.length === 1 && is_zip_file(list[0]!)) {
        set_zip_file(list[0]!);
        set_raw_files([]);
        set_relative_paths(null);
        return;
      }

      set_zip_file(null);
      set_raw_files(list);
      set_relative_paths(null);
    },
    [],
  );

  const on_drop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    set_drag_active(false);

    const result = await collect_bundle_from_drop(e.dataTransfer);

    if (result.kind === 'reject') {
      set_pack_error(result.message);
      return;
    }

    set_pack_error(null);

    if (result.kind === 'zip') {
      set_zip_file(result.file);
      set_raw_files([]);
      set_relative_paths(null);
      return;
    }

    set_zip_file(null);
    set_raw_files(result.files);
    set_relative_paths(result.relative_paths);
  }, []);

  const total_bytes =
    packed_files?.reduce((acc, f) => acc + f.size_bytes, 0) ?? 0;

  const bundle_fingerprint = useMemo(
    () =>
      packed_files
        ?.map((f) => `${f.path}\0${f.size_bytes}`)
        .sort()
        .join('\n') ?? '',
    [packed_files],
  );

  return (
    <RegistryPageLayout
      eyebrow="Solana registry"
      title={<RegistryPageTitle>Put a release on the record.</RegistryPageTitle>}
      description={
        <p>
          Add files, a project folder, or a zip, set registry id and version, then
          connect your wallet. Entry is{' '}
          <span className="font-mono text-[0.95em] tabular text-foreground">
            /index.md
          </span>{' '}
          at the bundle root.
        </p>
      }
    >
      <section
        aria-label="Publish bundle and release"
        className={cn('grid min-w-0', registry_feed_shell)}
      >
        <div
          className={cn(registry_feed_x, registry_feed_publish_header_grid)}
        >
          <div className={registry_feed_column_header_typography}>Source</div>
          <div
            className={cn(
              registry_feed_column_header_typography,
              'text-right sm:text-right',
            )}
          >
            Registry id · Version
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 divide-y divide-border/30 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,19rem)] lg:divide-x lg:divide-y-0">
          <div className="min-w-0 divide-y divide-border/30">
            <p
              className={cn(
                registry_feed_x,
                'py-2.5 text-[12px] leading-snug text-muted-foreground',
              )}
            >
              {BUNDLE_SOURCE_HINT}
            </p>

            <input
              ref={bundle_input_ref}
              type="file"
              className="sr-only"
              multiple
              onChange={on_bundle_change}
            />

            <div
              role="region"
              aria-label="Bundle upload"
              onDragEnter={(e) => {
                e.preventDefault();
                set_drag_active(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDragLeave={() => set_drag_active(false)}
              onDrop={(e) => {
                void on_drop(e);
              }}
              className={cn(
                registry_feed_x,
                'grid gap-4 py-4 transition-[background-color] duration-200 ease-out sm:py-5',
                drag_active && 'bg-muted/15',
              )}
            >
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Upload
                  className="size-6 text-muted-foreground"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <p className="text-[13px] font-medium text-foreground">
                  Drop bundle here or browse
                </p>
                <p className="max-w-[44ch] text-[12px] leading-snug text-muted-foreground">
                  One .zip unpacks in the browser. Multiple files map to the
                  bundle root. Drag a folder from your desktop to keep paths.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[12px]"
                  onClick={on_pick_bundle}
                >
                  Choose bundle
                </Button>
                {packed_files && packed_files.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[12px] text-muted-foreground hover:text-foreground"
                    onClick={reset_sources}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            {unpack_busy ? (
              <div className={cn(registry_feed_x, 'py-2.5')}>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Unpacking archive…
                </p>
              </div>
            ) : null}

            {pack_error ? (
              <div className={registry_feed_x}>
                <p
                  className="border-b border-destructive/30 bg-destructive/5 py-2.5 text-[12.5px] text-destructive"
                  role="alert"
                >
                  {pack_error}
                </p>
              </div>
            ) : null}

            {packed_files && packed_files.length > 0 && !unpack_busy ? (
              <div className={cn(registry_feed_x, 'py-4')}>
                <p
                  className={cn(
                    registry_feed_column_header_typography,
                    'tracking-[0.2em]',
                  )}
                >
                  Bundle preview
                </p>
                <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11.5px] tabular text-foreground-soft">
                  <div>
                    <dt className="sr-only">Files</dt>
                    <dd>{packed_files.length} files</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Total size</dt>
                    <dd>{format_bytes(total_bytes)}</dd>
                  </div>
                </dl>
                <ul
                  className="mt-2 max-h-46 divide-y divide-border/30 overflow-y-auto border-t border-border/40 font-mono text-[10.5px] leading-snug text-foreground/85"
                >
                  {packed_files.slice(0, 80).map((f) => (
                    <li
                      key={f.path}
                      className="truncate py-1.5 sm:py-1"
                      title={f.path}
                    >
                      {f.path}
                    </li>
                  ))}
                </ul>
                {packed_files.length > 80 ? (
                  <p className="mt-2 text-[10.5px] text-muted-foreground">
                    Showing 80 of {packed_files.length} paths.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 divide-y divide-border/30 lg:sticky lg:top-24 lg:self-start">
            <div className={cn(registry_feed_x, 'py-2 sm:hidden')}>
              <p className={registry_feed_column_header_typography}>Release</p>
            </div>
            <div className={cn(registry_feed_x, 'grid gap-6 py-4 sm:py-5')}>
              <div className="grid gap-2">
                <Label
                  htmlFor="pub-registry-id"
                  className={cn(
                    registry_feed_column_header_typography,
                    'font-mono',
                  )}
                >
                  Registry id
                </Label>
                <Input
                  id="pub-registry-id"
                  value={registry_id}
                  onChange={(e) => set_registry_id(e.target.value)}
                  placeholder="river-notes"
                  autoComplete="off"
                  spellCheck={false}
                  className={registry_feed_field_input}
                />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Lowercase letters, numbers, dots, underscores, hyphens. First
                  character must be a letter or digit.
                </p>
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="pub-version"
                  className={cn(
                    registry_feed_column_header_typography,
                    'font-mono',
                  )}
                >
                  Version
                </Label>
                <Input
                  id="pub-version"
                  value={version}
                  onChange={(e) => set_version(e.target.value)}
                  placeholder="1.0.0"
                  autoComplete="off"
                  className={registry_feed_field_input}
                />
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Root must include <span className="font-mono">/index.md</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 border-t border-border">
          <PublishComposerFooter
            bundle_fingerprint={bundle_fingerprint}
            packed_files={packed_files}
            registry_id={registry_id}
            version={version}
          />
        </div>
      </section>
    </RegistryPageLayout>
  );
}

function PublishComposerFooter({
  bundle_fingerprint,
  packed_files,
  registry_id,
  version,
}: {
  bundle_fingerprint: string;
  packed_files: PublishSessionFile[] | null;
  registry_id: string;
  version: string;
}) {
  const composed = useMemo(() => {
    if (!packed_files?.length) {
      return { kind: 'needs_bundle' as const };
    }

    try {
      const session = build_standalone_publish_session({
        metadata: { registry_id, version },
        files: packed_files,
      });
      return { kind: 'ready' as const, session };
    } catch (error: unknown) {
      return {
        kind: 'invalid' as const,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, [packed_files, registry_id, version]);

  return (
    <div className={cn(registry_feed_x, 'grid gap-3 py-5 sm:py-6')}>
      {composed.kind === 'invalid' ? (
        <p
          className="border-b border-destructive/30 bg-destructive/5 py-2.5 text-[12.5px] text-destructive"
          role="alert"
        >
          {composed.message}
        </p>
      ) : null}
      {composed.kind === 'ready' ? (
        <PublishFlowPanel
          key={`${registry_id.trim()}\0${version.trim()}\0${bundle_fingerprint}`}
          session={composed.session}
        />
      ) : null}
    </div>
  );
}
