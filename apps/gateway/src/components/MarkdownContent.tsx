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
        'prose prose-neutral max-w-none dark:prose-invert',
        'prose-pre:rounded-lg prose-pre:border prose-pre:bg-muted prose-pre:text-sm',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-img:rounded-lg prose-img:border',
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
