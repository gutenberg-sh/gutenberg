import type { PublishSessionFile } from '@gutenberg/core';
import { Archive, FolderOpen, LayoutGrid, Upload } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { PublishFlowPanel } from '@/components/publish/PublishFlowPanel';
import { Container } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { build_standalone_publish_session } from '@/lib/build-standalone-publish-session';
import { format_bytes } from '@/lib/format';
import {
  type BrowserPackMode,
  pack_browser_file_selection,
  pack_zip_file,
} from '@/lib/pack-files-for-publish';
import { cn } from '@/lib/utils';

const MODE_COPY: Record<BrowserPackMode, { label: string; hint: string }> = {
  folder: {
    label: 'Folder',
    hint: 'Uses your browser folder picker so relative paths match your project.',
  },
  files: {
    label: 'Files',
    hint: 'Drop or choose multiple files. Each file becomes /filename at the bundle root.',
  },
  zip: {
    label: 'Zip',
    hint: 'One .zip archive; we unpack in the browser — nothing is uploaded until you sign.',
  },
};

export function PublishWorkspace() {
  const [search_params] = useSearchParams();
  const [mode, set_mode] = useState<BrowserPackMode>('folder');
  const [raw_files, set_raw_files] = useState<File[]>([]);
  const [zip_file, set_zip_file] = useState<File | null>(null);
  const [packed_files, set_packed_files] = useState<
    PublishSessionFile[] | null
  >(null);
  const [pack_error, set_pack_error] = useState<string | null>(null);
  const [unpack_busy, set_unpack_busy] = useState(false);
  const [drag_active, set_drag_active] = useState(false);

  const folder_input_ref = useRef<HTMLInputElement>(null);
  const files_input_ref = useRef<HTMLInputElement>(null);
  const zip_input_ref = useRef<HTMLInputElement>(null);

  const [registry_id, set_registry_id] = useState(
    () => search_params.get('registry_id') ?? '',
  );
  const [version, set_version] = useState(
    () => search_params.get('version') ?? '',
  );

  const reset_sources = useCallback(() => {
    set_raw_files([]);
    set_zip_file(null);
    set_packed_files(null);
    set_pack_error(null);
    set_unpack_busy(false);
  }, []);

  const switch_mode = useCallback(
    (next: BrowserPackMode) => {
      set_mode(next);
      reset_sources();
    },
    [reset_sources],
  );

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
    if (mode === 'zip') {
      return;
    }

    const folder_or_files: 'folder' | 'files' = mode;

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
          mode: folder_or_files,
          files: raw_files,
        });

        if (cancelled) {
          return;
        }

        if (packed.length === 0) {
          set_packed_files(null);
          set_pack_error(
            'Every path was skipped (hidden files only). Choose a different folder or files.',
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
  }, [mode, raw_files, file_fingerprint]);

  const zip_fingerprint = zip_file
    ? `${zip_file.name}\0${zip_file.size}\0${zip_file.lastModified}`
    : '';

  useEffect(() => {
    if (mode !== 'zip' || !zip_file) {
      if (mode !== 'zip') {
        return;
      }

      queueMicrotask(() => {
        set_packed_files(null);
        set_pack_error(null);
      });
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
  }, [mode, zip_file, zip_fingerprint]);

  const on_pick_folder = useCallback(() => {
    folder_input_ref.current?.click();
  }, []);

  const on_pick_files = useCallback(() => {
    files_input_ref.current?.click();
  }, []);

  const on_pick_zip = useCallback(() => {
    zip_input_ref.current?.click();
  }, []);

  const on_folder_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? [...e.target.files] : [];
      set_raw_files(list);
      e.target.value = '';
    },
    [],
  );

  const on_files_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? [...e.target.files] : [];
      set_raw_files(list);
      e.target.value = '';
    },
    [],
  );

  const on_zip_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      set_zip_file(f);
      e.target.value = '';
    },
    [],
  );

  const drop_zone_active = mode !== 'folder';

  const on_drop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      set_drag_active(false);

      if (mode === 'folder') {
        return;
      }

      const dt = e.dataTransfer.files;

      if (mode === 'zip') {
        const z =
          [...dt].find(
            (f) =>
              f.name.toLowerCase().endsWith('.zip') ||
              f.type === 'application/zip' ||
              f.type === 'application/x-zip-compressed',
          ) ?? null;

        if (!z) {
          set_pack_error('Drop a single .zip archive here.');
          return;
        }

        set_zip_file(z);
        return;
      }

      const list = [...dt].filter((f) => f.size > 0 || f.type !== '');
      if (list.length === 0) {
        set_pack_error('Drop one or more files (not empty folders).');
        return;
      }

      set_raw_files(list);
    },
    [mode],
  );

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
    <Container className="grid gap-10 pb-24 pt-12 lg:gap-12 lg:pb-32 lg:pt-16">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Publish
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[2.5rem]">
            Put a release on the record.
          </h1>
        </div>
        <p className="max-w-[62ch] text-[15px] leading-[1.68] text-foreground-soft">
          Add a folder, loose files, or a zip, set registry id and version, then
          connect your wallet. Entry is{' '}
          <span className="font-mono text-[0.95em] tabular text-foreground">
            /index.md
          </span>{' '}
          at the bundle root.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,300px)] lg:items-start lg:gap-8">
        <div className="grid gap-4">
          <section
            aria-labelledby="publish-source-title"
            className="border border-border bg-card/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className="border-b border-border/80 px-3 py-2 sm:px-4">
              <p
                id="publish-source-title"
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
              >
                Source bundle
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-foreground-soft">
                {MODE_COPY[mode].hint}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Bundle source type"
              className="flex flex-wrap gap-1 border-b border-border/60 p-1.5 sm:px-2.5"
            >
              {(
                [
                  ['folder', FolderOpen],
                  ['files', LayoutGrid],
                  ['zip', Archive],
                ] as const
              ).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mode === key}
                  onClick={() => switch_mode(key)}
                  className={cn(
                    'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 border px-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors sm:flex-none sm:px-3.5',
                    mode === key
                      ? 'border-border-strong bg-elevated text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground-soft',
                  )}
                >
                  <Icon
                    className="size-3 shrink-0"
                    strokeWidth={1.85}
                    aria-hidden
                  />
                  {MODE_COPY[key].label}
                </button>
              ))}
            </div>

            <input
              ref={folder_input_ref}
              type="file"
              className="sr-only"
              multiple
              {...({
                webkitdirectory: '',
              } as InputHTMLAttributes<HTMLInputElement>)}
              onChange={on_folder_change}
            />
            <input
              ref={files_input_ref}
              type="file"
              className="sr-only"
              multiple
              onChange={on_files_change}
            />
            <input
              ref={zip_input_ref}
              type="file"
              className="sr-only"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={on_zip_change}
            />

            <div className="p-3 sm:p-4">
              {mode === 'folder' ? (
                <div className="grid gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-auto w-full justify-center gap-2 rounded-none border-2 border-dashed border-border py-5 text-[13px] font-medium active:translate-y-px"
                    onClick={on_pick_folder}
                  >
                    <FolderOpen
                      className="size-4"
                      strokeWidth={1.85}
                      aria-hidden
                    />
                    Choose project folder
                  </Button>
                  <p className="text-center font-mono text-[10.5px] leading-snug text-muted-foreground">
                    Drag and drop cannot preserve folder paths reliably; the
                    picker keeps your tree intact.
                  </p>
                </div>
              ) : (
                <div
                  role={drop_zone_active ? 'region' : undefined}
                  aria-label={drop_zone_active ? 'Drop files here' : undefined}
                  onDragEnter={(e) => {
                    if (!drop_zone_active) {
                      return;
                    }
                    e.preventDefault();
                    set_drag_active(true);
                  }}
                  onDragOver={(e) => {
                    if (!drop_zone_active) {
                      return;
                    }
                    e.preventDefault();
                  }}
                  onDragLeave={() => set_drag_active(false)}
                  onDrop={drop_zone_active ? on_drop : undefined}
                  className={cn(
                    'grid gap-3 rounded-none border-2 border-dashed p-4 transition-colors sm:p-5',
                    drop_zone_active && drag_active
                      ? 'border-foreground/35 bg-muted/30'
                      : 'border-border bg-background/20',
                  )}
                >
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <Upload
                      className="size-7 text-muted-foreground"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <p className="text-[13px] font-medium text-foreground">
                      {mode === 'zip'
                        ? 'Drop a zip archive here'
                        : 'Drop files here or browse'}
                    </p>
                    <p className="max-w-[40ch] text-[12px] leading-snug text-muted-foreground">
                      {mode === 'zip'
                        ? 'One archive only. Nested folders inside the zip are kept.'
                        : 'Paths are flat at the root unless you switch to Folder or Zip.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-none active:translate-y-px"
                      onClick={mode === 'zip' ? on_pick_zip : on_pick_files}
                    >
                      {mode === 'zip' ? 'Choose zip' : 'Choose files'}
                    </Button>
                    {packed_files && packed_files.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-none text-muted-foreground hover:text-foreground"
                        onClick={reset_sources}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}

              {unpack_busy ? (
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                  Unpacking archive…
                </p>
              ) : null}

              {pack_error ? (
                <p
                  className="mt-3 border border-destructive/35 bg-destructive/5 px-2.5 py-2 text-[12.5px] text-destructive"
                  role="alert"
                >
                  {pack_error}
                </p>
              ) : null}

              {packed_files && packed_files.length > 0 && !unpack_busy ? (
                <div className="mt-3 border-t border-border/70 pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Bundle preview
                  </p>
                  <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11.5px] tabular text-foreground-soft">
                    <div>
                      <dt className="sr-only">Files</dt>
                      <dd>{packed_files.length} files</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Total size</dt>
                      <dd>{format_bytes(total_bytes)}</dd>
                    </div>
                  </dl>
                  <ul className="mt-2 max-h-[11.5rem] overflow-y-auto border border-border/60 bg-background/30 font-mono text-[10.5px] leading-snug text-foreground/85">
                    {packed_files.slice(0, 80).map((f) => (
                      <li
                        key={f.path}
                        className="truncate border-b border-border/40 px-2 py-1 last:border-b-0"
                        title={f.path}
                      >
                        {f.path}
                      </li>
                    ))}
                  </ul>
                  {packed_files.length > 80 ? (
                    <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                      Showing 80 of {packed_files.length} paths.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-20">
          <section className="border border-border bg-card/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Release details
            </p>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pub-registry-id">Registry ID</Label>
                <Input
                  id="pub-registry-id"
                  value={registry_id}
                  onChange={(e) => set_registry_id(e.target.value)}
                  placeholder="river-notes"
                  autoComplete="off"
                  spellCheck={false}
                  className="rounded-none font-mono text-[13px]"
                />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Lowercase letters, numbers, dots, underscores, hyphens. First
                  character must be a letter or digit.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pub-version">Version</Label>
                <Input
                  id="pub-version"
                  value={version}
                  onChange={(e) => set_version(e.target.value)}
                  placeholder="1.0.0"
                  autoComplete="off"
                  className="rounded-none font-mono text-[13px]"
                />
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Root must include <span className="font-mono">/index.md</span>.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <PublishComposerFooter
        bundle_fingerprint={bundle_fingerprint}
        packed_files={packed_files}
        registry_id={registry_id}
        version={version}
      />
    </Container>
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
    <div className="mt-6 grid gap-3 lg:mt-8">
      {composed.kind === 'invalid' ? (
        <p
          className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive"
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
