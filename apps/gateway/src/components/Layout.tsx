import { registry_shell_x } from '@/lib/registry-surface';
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
        'mx-auto w-full max-w-[1332px]',
        registry_shell_x,
        className,
      )}
    >
      {children}
    </As>
  );
}
