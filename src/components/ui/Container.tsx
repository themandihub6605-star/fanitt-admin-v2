import type { PropsWithChildren } from 'react';
import { cn } from '@/utils/cn';

export function Container({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('mx-auto w-full max-w-[1240px] px-gutter', className)}>{children}</div>;
}
