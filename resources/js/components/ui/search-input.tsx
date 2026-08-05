import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { debounce } from "lodash"
import { useEffect, useMemo, useState } from "react"
import { router } from "@inertiajs/react"

interface SearchInputProps {
    placeholder?: string
    searchValue?: string
    onSearch?: (value: string) => void
    debounceTime?: number
    className?: string
}

export default function SearchInput({
    placeholder = "Buscar...",
    searchValue = "",
    onSearch,
    debounceTime = 500,
    className = ""
}: SearchInputProps) {
    const [localValue, setLocalValue] = useState(searchValue)

    // Actualizar el valor local cuando cambia el prop
    useEffect(() => {
        setLocalValue(searchValue)
    }, [searchValue])

    // Función para actualizar la URL con Inertia
    const updateURL = (value: string) => {
        const url = new URL(window.location.href)

        if (value) {
            url.searchParams.set('search', value)
        } else {
            url.searchParams.delete('search')
        }

        // Reset to first page when searching
        url.searchParams.delete('page')

        router.get(url.pathname + url.search, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        })
    }

    // Debounce the search function
    const debouncedSearch = useMemo(
        () => debounce((value: string) => {
            if (onSearch) {
                onSearch(value)
            } else {
                updateURL(value)
            }
        }, debounceTime),
        [onSearch, debounceTime]
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setLocalValue(value)
        debouncedSearch(value)
    }

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedSearch.cancel()
        }
    }, [debouncedSearch])

    const handleClear = () => {
        setLocalValue("")
        debouncedSearch("")
    }

    return (
        <div className={`relative ${className || "w-full max-w-md"}`}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="text"
                placeholder={placeholder}
                value={localValue}
                onChange={handleChange}
                className="pl-9 pr-8"
            />
            {localValue && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-red-50 text-red-500 hover:text-red-600"
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    )
}
