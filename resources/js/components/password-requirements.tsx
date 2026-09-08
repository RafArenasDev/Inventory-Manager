import { PASSWORD_RULES } from '@/lib/password-policy';
import { Check, X } from 'lucide-react';

export function PasswordRequirements({ value }: { value: string }) {
    return (
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {PASSWORD_RULES.map((rule) => {
                const met = rule.test(value);
                return (
                    <li
                        key={rule.key}
                        className={`flex items-center gap-1.5 text-xs ${
                            met ? 'text-emerald-600 dark:text-emerald-500' : 'text-gray-400 dark:text-gray-500'
                        }`}
                    >
                        {met ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                        {rule.label}
                    </li>
                );
            })}
        </ul>
    );
}
