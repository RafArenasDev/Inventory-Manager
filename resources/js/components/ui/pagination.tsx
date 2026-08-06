import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, router } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

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
}

const edgeButtonClass = "px-1.5 py-0.5 border rounded flex items-center justify-center min-w-[24px] text-xs sm:px-2 sm:py-1 sm:min-w-[28px]";

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
        const url = new URL(window.location.href);
        url.searchParams.set('per_page', value);
        // La página actual puede quedar fuera de rango con el nuevo tamaño; volver a la 1.
        url.searchParams.set('page', '1');
        router.get(url.pathname + url.search, {}, { preserveState: true, replace: true });
    };

    const buildPageUrl = (page: number) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(page));
        url.searchParams.set('per_page', perPage);
        return url.pathname + url.search;
    };

    const currentPage = data.current_page ?? 1;
    const lastPage = data.last_page ?? 1;
    const isFirstPage = currentPage <= 1;
    const isLastPage = currentPage >= lastPage;

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
                {isFirstPage ? (
                    <span className={`${edgeButtonClass} opacity-50 cursor-not-allowed`}>
                        <ChevronsLeft size={10} />
                    </span>
                ) : (
                    <Link
                        href={buildPageUrl(1)}
                        preserveState
                        className={`${edgeButtonClass} bg-background hover:bg-accent hover:text-accent-foreground`}
                    >
                        <ChevronsLeft size={10} />
                    </Link>
                )}
                {data.links.map((link, index) => {
                    const isPrevious = link.label.includes('previous') || link.label.includes('«');
                    const isNext = link.label.includes('next') || link.label.includes('»');
                    const isNumber = !isPrevious && !isNext;

                    if (!link.url) {
                        return (
                            <span
                                key={index}
                                className={`px-1.5 py-0.5 border rounded flex items-center justify-center min-w-[24px] text-xs opacity-50 cursor-not-allowed
                                    sm:px-2 sm:py-1 sm:min-w-[28px] ${isNumber ? 'hidden sm:flex' : ''}`}
                            >
                                {isPrevious ? (
                                    <ChevronLeft size={10} />
                                ) : isNext ? (
                                    <ChevronRight size={10} />
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
                            className={`px-1.5 py-0.5 border rounded flex items-center justify-center min-w-[24px] text-xs
                                ${link.active ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent hover:text-accent-foreground'}
                                sm:px-2 sm:py-1 sm:min-w-[28px] ${isNumber ? 'hidden sm:flex' : ''}`}
                        >
                            {isPrevious ? (
                                <ChevronLeft size={10} />
                            ) : isNext ? (
                                <ChevronRight size={10} />
                            ) : (
                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                            )}
                        </Link>
                    );
                })}
                {isLastPage ? (
                    <span className={`${edgeButtonClass} opacity-50 cursor-not-allowed`}>
                        <ChevronsRight size={10} />
                    </span>
                ) : (
                    <Link
                        href={buildPageUrl(lastPage)}
                        preserveState
                        className={`${edgeButtonClass} bg-background hover:bg-accent hover:text-accent-foreground`}
                    >
                        <ChevronsRight size={10} />
                    </Link>
                )}
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="whitespace-nowrap">Registros por página:</span>
                <Select onValueChange={handlePerPageChange} value={perPage}>
                    <SelectTrigger className="w-[70px] text-xs sm:w-[90px] sm:text-sm">
                        <SelectValue placeholder={perPage} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};
