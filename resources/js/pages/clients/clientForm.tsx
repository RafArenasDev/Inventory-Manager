import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Swal from '@/lib/swal';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

// Interface unificada - id es requerido para Client
interface Client {
    id: number;
    document_type: string;
    document_number: number | string;
    verification_digit?: number;
    name: string;
    department_id?: number;
    city_id?: number;
    phone?: string;
    cellphone?: string;
    address?: string;
    email?: string;
    is_active: boolean;
}

const DOCUMENT_TYPES = ['CC', 'TI', 'CE', 'Pasaporte', 'NIT'];

interface Department {
    id: number;
    name: string;
}

interface City {
    id: number;
    name: string;
}

interface ClientFormProps {
    client?: Omit<Client, 'id'> & { id?: number }; // id opcional para creación
    onCancel: () => void;
    onSaved?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    userPermissions: string[];
    departments?: Department[];
    cities?: City[];
    onSuccess?: (client: Client) => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ client, onCancel, onSaved, onDirtyChange, userPermissions, departments = [], onSuccess }) => {
    const { data, setData, put, processing, reset, errors, setError, clearErrors, isDirty, transform } = useForm({
        document_type: client?.document_type || '',
        document_number: client?.document_number || '',
        verification_digit: client?.verification_digit || '',
        name: client?.name || '',
        department_id: client?.department_id || '',
        city_id: client?.city_id || '',
        phone: client?.phone || '',
        cellphone: client?.cellphone || '',
        address: client?.address || '',
        email: client?.email || '',
    });

    const [availableCities, setAvailableCities] = useState<City[]>([]);
    // quickStore (creación) va por axios directo, no por useForm.post — así que
    // `processing` de useForm nunca se activa ahí; sin este estado propio, un
    // doble clic en "Crear Cliente" podía disparar dos requests y crear el
    // cliente duplicado.
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    useEffect(() => {
        if (client?.department_id) {
            fetchCities(client.department_id.toString());
        }
    }, []);

    useEffect(() => {
        if (data.department_id) {
            fetchCities(data.department_id.toString());
        } else {
            setAvailableCities([]);
            setData('city_id', '');
        }
    }, [data.department_id]);

    const fetchCities = async (departmentId: string) => {
        if (!departmentId) {
            setAvailableCities([]);
            setData('city_id', '');
            return;
        }

        try {
            const response = await axios.get(`/clients/cities/${departmentId}`);
            setAvailableCities(response.data || []);
            if (!response.data.some((city: City) => city.id === data.city_id)) {
                setData('city_id', '');
            }
        } catch (error) {
            console.error('Error fetching cities:', error);
            setAvailableCities([]);
            setData('city_id', '');
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Error al cargar ciudades',
                text: 'No se pudieron cargar las ciudades. Intenta de nuevo.',
                showConfirmButton: false,
                timer: 2200,
            });
        }
    };

    const buildTrimmedPayload = () => ({
        ...data,
        name: data.name.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        cellphone: data.cellphone.trim(),
        email: data.email.trim(),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (client?.id) {
            transform(() => buildTrimmedPayload());
            put(route('clients.update', client.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Cliente actualizado correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    if (onSaved) {
                        onSaved();
                    } else {
                        onCancel();
                    }
                },
                onError: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al actualizar el cliente',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        } else {
            // quickStore (creación rápida desde ventas) va por axios directo, no
            // por useForm.post, porque necesita leer el cliente creado del JSON
            // de respuesta al vuelo (onSuccess) — pero eso significa que los
            // errores 422 del servidor NO llegan solos a `errors`; hay que
            // engancharlos a mano con setError para que InputError los muestre.
            clearErrors();
            setIsSubmitting(true);
            axios
                .post(route('clients.quickStore'), buildTrimmedPayload())
                .then((response) => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Cliente creado correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    if (onSuccess) {
                        onSuccess(response.data);
                    } else if (onSaved) {
                        onSaved();
                    } else {
                        onCancel();
                    }
                })
                .catch((error) => {
                    console.error('Error creating client:', error);
                    const serverErrors = error.response?.data?.errors as Record<string, string[]> | undefined;
                    if (serverErrors) {
                        Object.entries(serverErrors).forEach(([field, messages]) => {
                            setError(field as keyof typeof data, messages[0]);
                        });
                    }
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al crear el cliente',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                })
                .finally(() => setIsSubmitting(false));
        }
    };

    const isEditing = !!client?.id;

    const canSubmit = isEditing ? userPermissions.includes('Editar Clientes') : userPermissions.includes('Crear Clientes');

    const isFormValid =
        data.document_type.trim() !== '' &&
        String(data.document_number ?? '').trim() !== '' &&
        data.name.trim() !== '' &&
        (data.document_type !== 'NIT' || String(data.verification_digit ?? '').trim() !== '') &&
        data.department_id !== '' &&
        data.city_id !== '' &&
        data.address.trim() !== '' &&
        data.cellphone.trim() !== '' &&
        data.email.trim() !== '';

    const isBusy = processing || isSubmitting;

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto p-1">
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300">
                    Los datos de este cliente se usarán únicamente para la gestión de ventas, garantías y facturación de este establecimiento,
                    conforme a la Ley 1581 de 2012.
                </div>
                <div className="space-y-4">
                    {/* Fila 1: Tipo de Documento · Número de Documento */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="document_type" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Tipo de Documento *
                            </Label>
                            <Combobox
                                items={DOCUMENT_TYPES}
                                value={data.document_type || null}
                                onValueChange={(value: string | null) => setData('document_type', value ?? '')}
                            >
                                <ComboboxInput placeholder="Seleccione tipo de documento" aria-invalid={!!errors.document_type} className="w-full" />
                                <ComboboxContent>
                                    <ComboboxEmpty>No se encontraron resultados.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(type: string) => (
                                            <ComboboxItem key={type} value={type}>
                                                {type}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                            <InputError message={errors.document_type} />
                        </div>

                        <div>
                            <Label htmlFor="document_number" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Número de Documento *
                            </Label>
                            <Input
                                id="document_number"
                                type={['CC', 'TI', 'NIT'].includes(data.document_type) ? 'number' : 'text'}
                                value={data.document_number}
                                onChange={(e) => setData('document_number', e.target.value)}
                                aria-invalid={!!errors.document_number}
                                className="w-full"
                                placeholder="Ingrese el número de documento"
                            />
                            <InputError message={errors.document_number} />
                        </div>
                    </div>

                    {/* Fila condicional: Dígito de Verificación (solo NIT) */}
                    {data.document_type === 'NIT' && (
                        <div>
                            <Label htmlFor="verification_digit" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Dígito de Verificación *
                            </Label>
                            <Input
                                id="verification_digit"
                                type="number"
                                value={data.verification_digit}
                                onChange={(e) => setData('verification_digit', e.target.value)}
                                aria-invalid={!!errors.verification_digit}
                                className="w-full"
                                placeholder="Ingrese el dígito de verificación"
                            />
                            <InputError message={errors.verification_digit} />
                        </div>
                    )}

                    {/* Fila 2: Nombre */}
                    <div>
                        <Label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nombre *
                        </Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            aria-invalid={!!errors.name}
                            className="w-full"
                            placeholder="Ingrese el nombre"
                        />
                        <InputError message={errors.name} />
                    </div>

                    {/* Fila 3: Departamento · Ciudad */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="department_id" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Departamento *
                            </Label>
                            <Combobox
                                items={departments}
                                itemToStringLabel={(d: Department) => d.name}
                                itemToStringValue={(d: Department) => d.id.toString()}
                                value={departments.find((d) => d.id === data.department_id) ?? null}
                                onValueChange={(d: Department | null) => setData('department_id', d ? d.id : '')}
                            >
                                <ComboboxInput placeholder="Seleccione un departamento" aria-invalid={!!errors.department_id} className="w-full" />
                                <ComboboxContent>
                                    <ComboboxEmpty>No hay departamentos disponibles.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(department: Department) => (
                                            <ComboboxItem key={department.id} value={department}>
                                                {department.name}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                            <InputError message={errors.department_id} />
                        </div>

                        <div>
                            <Label htmlFor="city_id" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ciudad *
                            </Label>
                            <Combobox
                                items={availableCities}
                                itemToStringLabel={(c: City) => c.name}
                                itemToStringValue={(c: City) => c.id.toString()}
                                value={availableCities.find((c) => c.id === data.city_id) ?? null}
                                onValueChange={(c: City | null) => setData('city_id', c ? c.id : '')}
                                disabled={!availableCities.length}
                            >
                                <ComboboxInput placeholder="Seleccione una ciudad" aria-invalid={!!errors.city_id} className="w-full" />
                                <ComboboxContent>
                                    <ComboboxEmpty>No hay ciudades disponibles.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(city: City) => (
                                            <ComboboxItem key={city.id} value={city}>
                                                {city.name}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                            <InputError message={errors.city_id} />
                        </div>
                    </div>

                    {/* Fila 4: Dirección */}
                    <div>
                        <Label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Dirección *
                        </Label>
                        <Input
                            id="address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            aria-invalid={!!errors.address}
                            className="w-full"
                            placeholder="Ingrese la dirección"
                        />
                        <InputError message={errors.address} />
                    </div>

                    {/* Fila 5: Teléfono · Celular */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Teléfono
                            </Label>
                            <Input
                                id="phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                aria-invalid={!!errors.phone}
                                className="w-full"
                                placeholder="Ingrese el número de teléfono"
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div>
                            <Label htmlFor="cellphone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Celular *
                            </Label>
                            <Input
                                id="cellphone"
                                value={data.cellphone}
                                onChange={(e) => setData('cellphone', e.target.value)}
                                aria-invalid={!!errors.cellphone}
                                className="w-full"
                                placeholder="Ingrese el número de celular"
                            />
                            <InputError message={errors.cellphone} />
                        </div>
                    </div>

                    {/* Fila 6: Email */}
                    <div>
                        <Label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email *
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            aria-invalid={!!errors.email}
                            className="w-full"
                            placeholder="Ingrese el correo electrónico"
                        />
                        <InputError message={errors.email} />
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" onClick={onCancel} variant="outline" disabled={isBusy}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={isBusy || !isFormValid}>
                        {isBusy ? 'Guardando...' : isEditing ? 'Actualizar Cliente' : 'Crear Cliente'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default ClientForm;
