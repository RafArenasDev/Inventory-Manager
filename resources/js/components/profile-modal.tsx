import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Swal from '@/lib/swal';
import { type SharedData } from '@/types';

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, clearErrors } = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    useEffect(() => {
        if (open) {
            setData({ name: auth.user.name, email: auth.user.email });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: 'Perfil actualizado correctamente',
                    showConfirmButton: false,
                    timer: 2000,
                });
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Perfil</DialogTitle>
                    <DialogDescription>Actualiza el nombre y correo electrónico de tu cuenta.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="profile-name">Nombre</Label>
                        <Input
                            id="profile-name"
                            className="w-full"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            autoComplete="name"
                            placeholder="Nombre completo"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="profile-email">Correo electrónico</Label>
                        <Input
                            id="profile-email"
                            type="email"
                            className="w-full"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="username"
                            placeholder="Correo electrónico"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
