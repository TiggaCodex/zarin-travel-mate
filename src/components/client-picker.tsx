import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClientDialog } from "@/components/client-dialog";
import { useClients, type Client } from "@/lib/zarin-data";
import { cn } from "@/lib/utils";

export function ClientPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (clientId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: clients, isLoading } = useClients();

  const selected = useMemo(
    () => (clients ?? []).find((client) => client.id === value) ?? null,
    [clients, value],
  );

  function handleCreated(client: Client) {
    onChange(client.id);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-0 flex-1 justify-between font-normal"
          >
            <span className="truncate">
              {selected ? `${selected.full_name} — ${selected.phone}` : "Search and select a client"}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(28rem,90vw)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name or phone…" />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading clients…" : "No client found. Add a new one."}
              </CommandEmpty>
              <CommandGroup>
                {(clients ?? []).map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.full_name} ${client.phone}`}
                    onSelect={() => {
                      onChange(client.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", client.id === value ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{client.full_name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{client.phone}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button type="button" variant="secondary" onClick={() => setDialogOpen(true)}>
        <Plus className="size-4" /> New client
      </Button>

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={handleCreated} />
    </div>
  );
}
