import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
    id: number;
    name: string;
    stock: number;
}

interface LowStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

const LowStockModal: React.FC<LowStockModalProps> = ({ isOpen, onClose, products }) => {
    if (!isOpen) return null;

    const getStockStatus = (stock: number) => {
        if (stock === 0) {
            return { label: 'Sin Stock', color: 'bg-red-600 text-white font-bold dark:bg-red-700' };
        } else if (stock <= 3) {
            return { label: 'Bajo', color: 'bg-red-600 text-white font-bold dark:bg-red-700' };
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[oklch(0.100205_0_0)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Productos con Stock Bajo
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {products.length} productos requieren atención
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-9 w-9 rounded-lg"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product, index) => {
                            const stockStatus = getStockStatus(product.stock);
                            return (
                                <div
                                    key={index}
                                    className="bg-muted/30 rounded-lg p-4 border border-border hover:border-blue-600/50 transition-colors"
                                >
                                    <div className="mb-3">
                                        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">
                                            {product.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-foreground">
                                            Stock: {product.stock}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${stockStatus?.color}`}>
                                            {stockStatus?.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {products.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">
                                No hay productos con stock bajo
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
                    <Button onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LowStockModal;
