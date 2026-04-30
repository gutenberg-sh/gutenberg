import { Injectable } from '@nestjs/common';
import type MarkdownIt from 'markdown-it';
import type sanitize from 'sanitize-html';

/** markdown-it is CJS; Nest emits `require('markdown-it').default`, which is undefined at runtime. */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS ctor, not `import default`
const MarkdownItCtor = require('markdown-it') as new (
  options?: import('markdown-it').Options,
) => MarkdownIt;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sanitizeHtml = require('sanitize-html') as typeof sanitize;

@Injectable()
export class MarkdownRenderService {
  private readonly md = new MarkdownItCtor({
    html: false,
    linkify: true,
    typographer: true,
  });

  /** Markdown source → sanitized HTML fragment (no outer document). */
  render_markdown_fragment(markdown: string): string {
    const raw = this.md.render(markdown);

    return sanitizeHtml(raw, {
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'img',
        'pre',
        'code',
        'blockquote',
        'hr',
        'br',
        'div',
        'span',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
      ],
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'loading', 'width', 'height'],
        code: ['class'],
        th: ['colspan', 'rowspan', 'align'],
        td: ['colspan', 'rowspan', 'align'],
        '*': ['class', 'id'],
      },
      allowedSchemesByTag: {
        img: ['http', 'https', 'data', 'relative'],
        a: ['http', 'https', 'mailto', 'tel', 'relative'],
      },
      allowProtocolRelative: true,
      transformTags: {
        a: (tagName, attribs) => {
          const href = attribs.href;

          if (
            href &&
            (href.startsWith('http://') || href.startsWith('https://'))
          ) {
            return {
              tagName,
              attribs: {
                ...attribs,
                rel: 'noopener noreferrer',
                target: '_blank',
              },
            };
          }

          return { tagName, attribs };
        },
      },
    });
  }
}
