import { cn } from '@/lib/utils';

export function Container({
  children,
  className,
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'main' | 'section' | 'article' | 'header';
}) {
  return (
    <As
      className={cn(
        'mx-auto w-full max-w-[1332px] px-6 sm:px-6 lg:px-10',
        className,
      )}
    >
      {children}
    </As>
  );
}
