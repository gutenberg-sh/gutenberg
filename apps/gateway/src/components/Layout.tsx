import { cn } from '@/lib/utils';

export function Container({
  children,
  className,
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'header';
}) {
  return (
    <As className={cn('mx-auto w-full max-w-6xl px-6 lg:px-10', className)}>
      {children}
    </As>
  );
}
