export function formatWhatsAppNumber(rawNumber: string): string {
    const digits = rawNumber.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) {
        return `57${digits}`;
    }
    return digits;
}

export function getWhatsAppGreeting(): string {
    const bogotaTime = new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false });
    const hour = parseInt(bogotaTime);
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
}

export function openWhatsApp(rawNumber: string, message: string) {
    const link = `https://wa.me/${formatWhatsAppNumber(rawNumber)}?text=${encodeURIComponent(message)}`;
    window.open(link, '_blank');
}

export const BUSINESS_NAME = 'Inventory Manager';

interface PurchaseOrderMessageItem {
    product_name: string;
    product_code: string;
    quantity_requested: number;
}

// Todo pedido a proveedor se pide por WhatsApp — sea "Pedido Nuevo" o
// "Stock Bajo", creado desde el módulo de Pedidos o desde las alertas.
export function buildPurchaseOrderMessage(items: PurchaseOrderMessageItem[]): string {
    const lines = items.map((i) => `• ${i.product_name} (${i.product_code}) x${i.quantity_requested} und`).join('\n');
    return `${getWhatsAppGreeting()}, somos ${BUSINESS_NAME}. Queremos solicitar el siguiente pedido:\n\n${lines}`;
}
