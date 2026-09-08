import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

export default function InputError({ message, className = '', ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return (
        <p {...props} className={cn('mt-1 min-h-4 text-xs leading-4 text-red-600 dark:text-red-400', className)}>
            {message}
        </p>
    );
}
