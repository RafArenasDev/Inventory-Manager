import { forwardRef, type ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface IconActionButtonProps extends ComponentProps<typeof Button> {
    label: string;
}

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(
    ({ label, ...props }, ref) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button ref={ref} size="icon" aria-label={label} {...props} />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    ),
);

IconActionButton.displayName = 'IconActionButton';
