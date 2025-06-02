import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    data: {
        data: unknown[];
        links: Array<{
            active: boolean;
            label: string;
            url: string | null;
        }>;
        from: number;
        to: number;
        total: number;
    };
    perPage: string;
    onPerPageChange: (value: string) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
}

export const Pagination = ({
    data,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search
}: PaginationProps) => {
    const handlePerPageChange = (value: string) => {
        onPerPageChange(value);
        // Actualizar la URL con el nuevo parámetro per_page
        const url = new URL(window.location.href);
        url.searchParams.set('per_page', value);
        window.location.href = url.toString();
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4">
            {/* Información de paginación */}
            <div className="text-sm text-black dark:text-white">
                {search ? (
                    <p>
                        Mostrando <b>{filteredCount}</b> resultado{filteredCount !== 1 && 's'} filtrado{filteredCount !== 1 && 's'} de <b>{totalCount}</b> registro{totalCount !== 1 ? 's' : ''}
                    </p>
                ) : (
                    <p>
                        Mostrando <b>{data.from}</b> a <b>{data.to}</b> de <b>{data.total}</b> registro{data.total !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Selección de registros por página */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-black dark:text-white">Registros por página:</span>
                <Select onValueChange={handlePerPageChange} value={perPage}>
                    <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder={perPage === "-1" ? "Todos" : perPage} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="-1">Todos</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {/* Enlaces de paginación */}
            <div className="flex gap-1">
                {data.links.map((link, index) => {
                    const isPrevious = link.label.includes('previous') || link.label.includes('&laquo;');
                    const isNext = link.label.includes('next') || link.label.includes('&raquo;');

                    if (!link.url) {
                        return (
                            <span
                                key={index}
                                className="px-3 py-2 border rounded flex items-center justify-center min-w-[40px] opacity-50 cursor-not-allowed"
                            >
                                {isPrevious ? (
                                    <ChevronLeft size={16} />
                                ) : isNext ? (
                                    <ChevronRight size={16} />
                                ) : (
                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                )}
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={index}
                            href={`${link.url}&per_page=${perPage}`}
                            preserveState
                            className={`px-3 py-2 border rounded flex items-center justify-center min-w-[40px] ${link.active
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background hover:bg-accent hover:text-accent-foreground'
                                }`}
                        >
                            {isPrevious ? (
                                <ChevronLeft size={16} />
                            ) : isNext ? (
                                <ChevronRight size={16} />
                            ) : (
                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};
