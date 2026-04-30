import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <BookOpen className="size-5" aria-hidden />
          <span>Gutenberg</span>
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            gateway
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Lookup
          </Link>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted-foreground hover:text-foreground"
          >
            About
          </a>
        </nav>
      </div>
    </header>
  );
}
