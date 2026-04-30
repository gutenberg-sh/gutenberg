import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

const sanitize_schema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...((defaultSchema.attributes && defaultSchema.attributes.a) ?? []),
      'target',
      'rel',
    ],
    code: [
      ...((defaultSchema.attributes && defaultSchema.attributes.code) ?? []),
      'className',
    ],
    img: [
      ...((defaultSchema.attributes && defaultSchema.attributes.img) ?? []),
      'src',
      'alt',
      'title',
      'loading',
      'width',
      'height',
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https', 'data', 'blob'],
    href: ['http', 'https', 'mailto', 'tel'],
  },
};

export function MarkdownContent({
  source,
  resolve_url,
}: {
  source: string;
  resolve_url: (raw: string) => string | undefined;
}) {
  const components_def = useMemo(
    () => ({
      a({
        href,
        children,
        ...rest
      }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
        const resolved = href ? resolve_url(href) : undefined;
        const is_external =
          resolved !== undefined &&
          (resolved.startsWith('http://') || resolved.startsWith('https://'));

        return (
          <a
            href={resolved ?? href}
            target={is_external ? '_blank' : undefined}
            rel={is_external ? 'noopener noreferrer' : undefined}
            {...rest}
          >
            {children}
          </a>
        );
      },
      img({ src, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
        const resolved = typeof src === 'string' ? resolve_url(src) : undefined;

        return <img src={resolved ?? src} alt={alt ?? ''} {...rest} />;
      },
    }),
    [resolve_url],
  );

  return (
    <article
      className={cn(
        // Reading column held narrow (~70 chars) for editorial legibility.
        'prose prose-neutral dark:prose-invert',
        'prose-editorial max-w-[68ch]',
        // Headings stay sans-serif, body is serif via util class.
        'prose-headings:tracking-[-0.02em] prose-headings:text-foreground',
        'prose-h1:text-[2.05rem] prose-h1:font-semibold prose-h1:leading-[1.05]',
        'prose-h2:mt-14 prose-h2:text-[1.55rem] prose-h2:font-semibold',
        'prose-h3:mt-10 prose-h3:text-[1.18rem] prose-h3:font-semibold',
        'prose-p:text-foreground/90',
        'prose-a:text-foreground prose-a:underline-offset-[3px] prose-a:decoration-accent/60 hover:prose-a:decoration-accent',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:bg-transparent prose-blockquote:not-italic prose-blockquote:pl-6 prose-blockquote:font-normal prose-blockquote:text-foreground/80',
        'prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted/60 prose-pre:text-[12.5px] prose-pre:leading-relaxed',
        'prose-code:rounded-md prose-code:border prose-code:border-border/70 prose-code:bg-muted/60 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none',
        'prose-img:rounded-xl prose-img:border prose-img:border-border/70',
        'prose-hr:border-border/70',
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitize_schema]]}
        components={components_def}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
