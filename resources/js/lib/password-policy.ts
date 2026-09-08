// Mismas reglas que Password::defaults() en AppServiceProvider (min 12,
// mayúsculas+minúsculas, número, símbolo) — reflejadas acá solo para dar
// feedback inmediato en el checklist; la validación real sigue siendo la
// del backend, esto nunca reemplaza esa regla.
export const PASSWORD_RULES = [
    { key: 'length', label: 'Mínimo 12 caracteres', test: (v: string) => v.length >= 12 },
    { key: 'case', label: 'Mayúsculas y minúsculas', test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
    { key: 'number', label: 'Al menos un número', test: (v: string) => /[0-9]/.test(v) },
    { key: 'symbol', label: 'Al menos un símbolo', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const passwordMeetsPolicy = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value));
