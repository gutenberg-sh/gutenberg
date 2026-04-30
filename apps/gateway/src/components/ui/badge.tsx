import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badge_variants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>svg]:size-3 [&>svg]:mr-1',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-foreground text-background hover:bg-foreground/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive/12 text-destructive',
        outline: 'border-border text-foreground',
        success:
          'border-accent/30 bg-accent/10 text-accent-foreground/90 dark:text-accent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badge_variants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badge_variants({ variant }), className)} {...props} />
  );
}

export { Badge, badge_variants };
