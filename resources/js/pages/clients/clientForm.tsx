import React, { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox"
import axios from 'axios';

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
    const { data, setData, put, processing, reset, errors, isDirty } = useForm({
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
        is_active: client?.id ? !!client.is_active : true,
    });

    const [availableCities, setAvailableCities] = useState<City[]>([]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (client?.id) {
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
                    if (onSaved) { onSaved(); } else { onCancel(); }
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
            // Usar quickStore para creación rápida desde ventas
            axios.post(route('clients.quickStore'), data)
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
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al crear el cliente',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                });
        }
    };

    const isEditing = !!client?.id;

    const canSubmit = isEditing
        ? userPermissions.includes('Editar Clientes')
        : userPermissions.includes('Crear Clientes');

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
            <div>
                <Label htmlFor="document_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Documento *
                </Label>
                <Select
                    value={data.document_type || ''}
                    onValueChange={(value: string) => setData('document_type', value)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="CC">CC</SelectItem>
                        <SelectItem value="TI">TI</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="NIT">NIT</SelectItem>
                    </SelectContent>
                </Select>
                {errors.document_type && <p className="mt-1 text-sm text-red-600">{errors.document_type}</p>}
            </div>

                <div>
                    <Label htmlFor="document_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número de Documento *
                    </Label>
                    <Input
                        id="document_number"
                        type={['CC', 'TI', 'NIT'].includes(data.document_type) ? 'number' : 'text'}
                        value={data.document_number}
                        onChange={(e) => setData('document_number', e.target.value)}
                        className="w-full"
                        placeholder="Ingrese el número de documento"
                        required
                    />
                    {errors.document_number && <p className="mt-1 text-sm text-red-600">{errors.document_number}</p>}
                </div>

                {data.document_type === 'NIT' && (
                    <div>
                        <Label htmlFor="verification_digit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Dígito de Verificación
                        </Label>
                        <Input
                            id="verification_digit"
                            type="number"
                            value={data.verification_digit}
                            onChange={(e) => setData('verification_digit', e.target.value)}
                            className="w-full"
                            placeholder="Ingrese el dígito de verificación"
                        />
                        {errors.verification_digit && <p className="mt-1 text-sm text-red-600">{errors.verification_digit}</p>}
                    </div>
                )}

                <div>
                    <Label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre *
                    </Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="w-full"
                        placeholder="Ingrese el nombre"
                        required
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                    <Label htmlFor="department_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Departamento
                    </Label>
                    <Select
                        value={data.department_id?.toString() || ''}
                        onValueChange={(value: string) => {
                            setData('department_id', value ? parseInt(value) : '');
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione un departamento" />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.length ? (
                                departments.map((department) => (
                                    <SelectItem key={department.id} value={department.id.toString()}>
                                        {department.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>
                                    No hay departamentos disponibles
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {errors.department_id && <p className="mt-1 text-sm text-red-600">{errors.department_id}</p>}
                </div>

                <div>
                    <Label htmlFor="city_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ciudad
                    </Label>
                    <Select
                        value={data.city_id?.toString() || ''}
                        onValueChange={(value: string) => setData('city_id', value ? parseInt(value) : '')}
                        disabled={!availableCities.length}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione una ciudad" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableCities.length ? (
                                availableCities.map((city) => (
                                    <SelectItem key={city.id} value={city.id.toString()}>
                                        {city.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>
                                    No hay ciudades disponibles
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {errors.city_id && <p className="mt-1 text-sm text-red-600">{errors.city_id}</p>}
                </div>

                <div>
                    <Label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Dirección
                    </Label>
                    <Input
                        id="address"
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        className="w-full"
                        placeholder="Ingrese la dirección"
                    />
                    {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                </div>

                <div>
                    <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Teléfono
                    </Label>
                    <Input
                        id="phone"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        className="w-full"
                        placeholder="Ingrese el número de teléfono"
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>

                <div>
                    <Label htmlFor="cellphone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Celular
                    </Label>
                    <Input
                        id="cellphone"
                        value={data.cellphone}
                        onChange={(e) => setData('cellphone', e.target.value)}
                        className="w-full"
                        placeholder="Ingrese el número de celular"
                    />
                    {errors.cellphone && <p className="mt-1 text-sm text-red-600">{errors.cellphone}</p>}
                </div>

                <div>
                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="w-full"
                        placeholder="Ingrese el correo electrónico"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                {isEditing && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', !!checked)}
                        />
                        <Label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Activo
                        </Label>
                        {errors.is_active && <p className="mt-1 text-sm text-red-600">{errors.is_active}</p>}
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-300 dark:border-gray-600">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Guardando...' : isEditing ? 'Actualizar Cliente' : 'Crear Cliente'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default ClientForm;
