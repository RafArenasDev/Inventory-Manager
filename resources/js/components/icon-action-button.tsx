import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { forwardRef, type ComponentProps } from 'react';

interface IconActionButtonProps extends ComponentProps<typeof Button> {
    label: string;
}

export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(({ label, ...props }, ref) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <Button ref={ref} size="icon-sm" aria-label={label} {...props} />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
    </Tooltip>
));

IconActionButton.displayName = 'IconActionButton';
