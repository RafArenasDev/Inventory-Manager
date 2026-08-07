import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface ComboboxContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null)

function useComboboxContext(component: string) {
  const ctx = React.useContext(ComboboxContext)
  if (!ctx) {
    throw new Error(`${component} debe usarse dentro de <Combobox>`)
  }
  return ctx
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(extractText).join(" ").trim()
  if (React.isValidElement(node)) return extractText((node.props as { children?: React.ReactNode })?.children)
  return ""
}

// Recorre el árbol de children (sin montarlo) para conocer el label de cada
// ComboboxItem de antemano. Así el trigger puede mostrar el texto del valor
// ya seleccionado (p.ej. al editar un registro) sin depender de que el
// popover se haya abierto al menos una vez.
function collectLabels(node: React.ReactNode, map: Map<string, string>) {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as { value?: string; children?: React.ReactNode }
    if (child.type === ComboboxItem) {
      if (typeof props.value === "string") {
        map.set(props.value, extractText(props.children) || props.value)
      }
      return
    }
    if (props.children) {
      collectLabels(props.children, map)
    }
  })
}

interface ComboboxProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

function Combobox({ value, onValueChange, placeholder = "Seleccionar...", disabled, className, children }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const labels = React.useMemo(() => {
    const map = new Map<string, string>()
    collectLabels(children, map)
    return map
  }, [children])

  const label = value ? labels.get(value) : undefined

  return (
    <ComboboxContext.Provider value={{ value, onValueChange, open, setOpen: disabled ? () => {} : setOpen }}>
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            data-slot="combobox-trigger"
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-black dark:text-gray-100",
              !label && "text-gray-500 dark:text-gray-400",
              className
            )}
          >
            <span className="truncate">{label ?? placeholder}</span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        {children}
      </Popover>
    </ComboboxContext.Provider>
  )
}

function ComboboxContent({
  className,
  children,
  align = "start",
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={4}
        data-slot="combobox-content"
        className={cn(
          "bg-popover text-popover-foreground z-50 w-[var(--radix-popover-trigger-width)] min-w-[8rem] overflow-hidden rounded-md border p-0 shadow-md outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      >
        <Command shouldFilter>{children}</Command>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

function ComboboxInput({ placeholder = "Buscar...", ...props }: React.ComponentProps<typeof CommandInput>) {
  return <CommandInput placeholder={placeholder} {...props} />
}

function ComboboxList({ ...props }: React.ComponentProps<typeof CommandList>) {
  return <CommandList {...props} />
}

function ComboboxEmpty({ children = "No se encontraron resultados.", ...props }: React.ComponentProps<typeof CommandEmpty>) {
  return <CommandEmpty {...props}>{children}</CommandEmpty>
}

interface ComboboxItemProps extends Omit<React.ComponentProps<typeof CommandItem>, "value" | "onSelect"> {
  value: string
  children: React.ReactNode
  onSelect?: (value: string) => void
}

function ComboboxItem({ value, children, className, onSelect, ...props }: ComboboxItemProps) {
  const { value: selectedValue, onValueChange, setOpen } = useComboboxContext("ComboboxItem")
  const label = extractText(children) || value
  const isSelected = selectedValue === value

  return (
    <CommandItem
      value={`${label}__${value}`}
      onSelect={() => {
        onValueChange?.(value)
        onSelect?.(value)
        setOpen(false)
      }}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      <CheckIcon className={cn("size-4", isSelected ? "opacity-100" : "opacity-0")} />
      {children}
    </CommandItem>
  )
}

export { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList }
