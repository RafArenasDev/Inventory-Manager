import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { router } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PER_PAGE_OPTIONS = ['10', '25', '50', '100'];

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
        current_page?: number;
        last_page?: number;
    };
    perPage: string;
    onPerPageChange: (value: string) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    /** Nombre de la ruta POST dedicada a paginar/filtrar (ej. "products.search") — nunca se navega por GET con el filtro en la URL. */
    searchRoute: string;
    /** Filtros adicionales activos (además de search/page/per_page), ej. category_id, stock_filter. */
    extraFilters?: Record<string, string | undefined>;
}

const edgeButtonClass = "px-1.5 py-0.5 border rounded flex items-center justify-center min-w-[24px] text-xs sm:px-2 sm:py-1 sm:min-w-[28px] disabled:opacity-50 disabled:cursor-not-allowed bg-background hover:enabled:bg-accent hover:enabled:text-accent-foreground";

export const Pagination = ({
    data,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    searchRoute,
    extraFilters = {},
}: PaginationProps) => {
    const goToPage = (page: number, newPerPage?: string) => {
        router.post(
            route(searchRoute),
            { ...extraFilters, search, per_page: newPerPage ?? perPage, page },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePerPageChange = (value: string) => {
        onPerPageChange(value);
        // La página actual puede quedar fuera de rango con el nuevo tamaño; volver a la 1.
        goToPage(1, value);
    };

    const currentPage = data.current_page ?? 1;
    const lastPage = data.last_page ?? 1;
    const isFirstPage = currentPage <= 1;
    const isLastPage = currentPage >= lastPage;
    // Solo los links numéricos de Laravel — prev/next se resuelven aparte con
    // isFirstPage/isLastPage, la misma fuente de verdad que primera/última
    // página, para que las 4 flechas se deshabiliten con el mismo criterio.
    const numberLinks = data.links.filter((link) => !link.label.includes('previous') && !link.label.includes('«') && !link.label.includes('next') && !link.label.includes('»'));

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 p-2 sm:p-4 max-w-full overflow-hidden">
            <div className="text-xs sm:text-sm text-black dark:text-white whitespace-nowrap">
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

            <div className="flex gap-1 overflow-x-auto py-2 w-full justify-center sm:w-auto sm:overflow-visible">
                <button
                    type="button"
                    disabled={isFirstPage}
                    onClick={() => goToPage(1)}
                    className={edgeButtonClass}
                    aria-label="Primera página"
                >
                    <ChevronsLeft size={10} />
                </button>
                <button
                    type="button"
                    disabled={isFirstPage}
                    onClick={() => goToPage(currentPage - 1)}
                    className={edgeButtonClass}
                    aria-label="Página anterior"
                >
                    <ChevronLeft size={10} />
                </button>
                {numberLinks.map((link, index) => {
                    const pageNumber = parseInt(link.label, 10);

                    if (!link.url || Number.isNaN(pageNumber)) {
                        return (
                            <span
                                key={index}
                                className="hidden sm:flex px-1.5 py-0.5 border rounded items-center justify-center min-w-[24px] text-xs opacity-50 cursor-not-allowed sm:px-2 sm:py-1 sm:min-w-[28px]"
                            >
                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                            </span>
                        );
                    }

                    return (
                        <button
                            type="button"
                            key={index}
                            onClick={() => goToPage(pageNumber)}
                            className={`hidden sm:flex px-1.5 py-0.5 border rounded items-center justify-center min-w-[24px] text-xs
                                ${link.active ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent hover:text-accent-foreground'}
                                sm:px-2 sm:py-1 sm:min-w-[28px]`}
                        >
                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                        </button>
                    );
                })}
                <button
                    type="button"
                    disabled={isLastPage}
                    onClick={() => goToPage(currentPage + 1)}
                    className={edgeButtonClass}
                    aria-label="Página siguiente"
                >
                    <ChevronRight size={10} />
                </button>
                <button
                    type="button"
                    disabled={isLastPage}
                    onClick={() => goToPage(lastPage)}
                    className={edgeButtonClass}
                    aria-label="Última página"
                >
                    <ChevronsRight size={10} />
                </button>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="whitespace-nowrap">Registros por página:</span>
                <Combobox
                    items={PER_PAGE_OPTIONS}
                    value={perPage}
                    onValueChange={(value: string | null) => value && handlePerPageChange(value)}
                >
                    <ComboboxInput placeholder={perPage} className="w-[70px] text-xs sm:w-[90px] sm:text-sm" />
                    <ComboboxContent>
                        <ComboboxEmpty>No se encontraron resultados.</ComboboxEmpty>
                        <ComboboxList>
                            {(option: string) => (
                                <ComboboxItem key={option} value={option}>
                                    {option}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </div>
        </div>
    );
};
