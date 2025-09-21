import React, { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InventoryMovementForForm {
  id?: number;
  type: 'Entrada' | 'Salida';
  product_id: number | "" | null;
  quantity: number;
  date: string;
  notes?: string;
}

interface Product {
  id: number;
  name: string;
}

interface InventoryMovementFormProps {
  movement?: InventoryMovementForForm;
  onCancel: () => void;
  products: Product[];
  userPermissions: string[];
}

const InventoryMovementForm: React.FC<InventoryMovementFormProps> = ({
  movement,
  onCancel,
  products,
  userPermissions,
}) => {
  // Fecha actual en America/Bogota
  const now = new Date();
  const bogotaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Bogota"}));
  const year = bogotaTime.getFullYear();
  const month = String(bogotaTime.getMonth() + 1).padStart(2, '0');
  const day = String(bogotaTime.getDate()).padStart(2, '0');
  const formattedToday = `${year}-${month}-${day}`;

  const { data, setData, post, put, processing, errors, reset } = useForm({
    type: movement?.type || "Entrada",
    product_id: movement?.product_id || "",
    quantity: movement?.quantity || 0,
    date: movement?.date || formattedToday,
    notes: movement?.notes || "",
  });

  useEffect(() => {
    if (movement) {
      setData({
        type: movement.type,
        product_id: movement.product_id ?? "",
        quantity: movement.quantity,
        date: movement.date,
        notes: movement.notes || "",
      });
    } else {
      setData("date", formattedToday);
    }
  }, [movement, setData, formattedToday]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (movement?.id) {
      put(route("inventory-movements.update", movement.id), {
        onSuccess: () => {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "Movimiento actualizado correctamente",
            showConfirmButton: false,
            timer: 2200
          });
          reset();
          onCancel();
        },
        onError: (errors) => {
          if (Object.keys(errors).length > 0) {
            Swal.fire({
              position: "center",
              icon: "error",
              title: "Error al actualizar el movimiento",
              text: 'Por favor corrija los errores en el formulario.',
              showConfirmButton: false,
              timer: 2200
            });
          }
        },
      });
    } else {
      post(route("inventory-movements.store"), {
        onSuccess: () => {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "Movimiento registrado correctamente",
            showConfirmButton: false,
            timer: 2200
          });
          reset();
          onCancel();
        },
        onError: (errors) => {
          if (Object.keys(errors).length > 0) {
            Swal.fire({
              position: "center",
              icon: "error",
              title: "Error al crear el movimiento",
              text: 'Por favor corrija los errores en el formulario.',
              showConfirmButton: false,
              timer: 2200
            });
          }
        },
      });
    }
  };

  // Determinar si puede enviar el formulario
  const canSubmit = movement?.id
    ? userPermissions.includes('Actualizar Movimientos Inventario')
    : userPermissions.includes('Crear Movimientos Inventario');

  return (
    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div>
          <Label htmlFor="type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo *
          </Label>
          <Select value={data.type} onValueChange={(value: 'Entrada' | 'Salida') => setData("type", value)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleccione un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Entrada">Entrada</SelectItem>
              <SelectItem value="Salida">Salida</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
        </div>

        {/* Fecha */}
        <div>
          <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha *
          </Label>
          <Input
            id="date"
            type="date"
            value={data.date}
            onChange={(e) => setData("date", e.target.value)}
            max={formattedToday}
            className="mt-1"
            required
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
        </div>

        {/* Producto */}
        <div>
          <Label htmlFor="product_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Producto *
          </Label>
          <Select
            value={typeof data.product_id === 'number' ? data.product_id.toString() : ""}
            onValueChange={(value) =>
              setData("product_id", value ? Number(value) : "")
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleccione un producto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.product_id && (
            <p className="mt-1 text-sm text-red-600">{errors.product_id}</p>
          )}
        </div>

        {/* Cantidad */}
        <div>
          <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Cantidad *
          </Label>
          <Input
            id="quantity"
            type="number"
            value={data.quantity || ""}
            onChange={(e) => {
              const val = e.target.value;
              setData("quantity", val ? parseInt(val) : 0);
            }}
            min="1"
            placeholder="0"
            required
            className="mt-1"
          />
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
          )}
        </div>

        {/* Notas */}
        <div>
          <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Notas
          </Label>
          <Textarea
            id="notes"
            value={data.notes}
            onChange={(e) => setData("notes", e.target.value)}
            className="mt-1"
            rows={3}
            placeholder="Opcional: agregar notas sobre este movimiento..."
          />
          {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            Cancelar
          </Button>
          {canSubmit && (
            <Button type="submit" disabled={processing}>
              {processing ? "Guardando..." : movement?.id ? "Actualizar" : "Registrar"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default InventoryMovementForm;
