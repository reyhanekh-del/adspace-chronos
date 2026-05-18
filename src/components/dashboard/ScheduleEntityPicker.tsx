import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Layers, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
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
import type { Program } from "@/lib/schedule-data";

export type AdPackOption = {
  id: string;
  title: string;
  client?: string;
  campaign?: string;
};

type Props =
  | {
      mode: "program";
      programs: Program[];
      value: string;
      onChange: (programId: string) => void;
      adOptions?: never;
    }
  | {
      mode: "adpack";
      programs?: never;
      value: string;
      onChange: (title: string, meta?: Pick<AdPackOption, "client" | "campaign">) => void;
      adOptions: AdPackOption[];
    };

export function ScheduleEntityPicker(props: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const programLabel = useMemo(() => {
    if (props.mode !== "program") return "";
    const p = props.programs.find((x) => x.id === props.value);
    return p?.name ?? "";
  }, [props]);

  const adLabel = props.mode === "adpack" ? props.value : "";

  const display =
    props.mode === "program"
      ? programLabel || "Search programs…"
      : adLabel || "Search AD packs…";

  const filteredPrograms =
    props.mode === "program"
      ? props.programs.filter((p) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          return (
            p.name.toLowerCase().includes(q) ||
            p.client.toLowerCase().includes(q) ||
            (p.campaign?.toLowerCase().includes(q) ?? false)
          );
        })
      : [];

  const filteredAds =
    props.mode === "adpack"
      ? props.adOptions.filter((a) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          return (
            a.title.toLowerCase().includes(q) ||
            (a.client?.toLowerCase().includes(q) ?? false) ||
            (a.campaign?.toLowerCase().includes(q) ?? false)
          );
        })
      : [];

  const canUseQueryAsNew =
    props.mode === "adpack" &&
    query.trim().length > 0 &&
    !filteredAds.some((a) => a.title.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          <span className="flex items-center gap-2 min-w-0 truncate">
            {props.mode === "program" ? (
              <Tv className="h-4 w-4 shrink-0 text-slot-program" />
            ) : (
              <Layers className="h-4 w-4 shrink-0 text-slot-adpack" />
            )}
            <span className={cn("truncate", !display.includes("Search") && "font-medium")}>
              {display}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={props.mode === "program" ? "Search programs…" : "Search AD packs…"}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {props.mode === "program" ? "No programs found." : "No AD packs found."}
            </CommandEmpty>
            {props.mode === "program" && (
              <CommandGroup>
                {filteredPrograms.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      props.onChange(p.id);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        props.value === p.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {p.client}
                        {p.campaign ? ` · ${p.campaign}` : ""}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {props.mode === "adpack" && (
              <CommandGroup>
                {filteredAds.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={a.title}
                    onSelect={() => {
                      props.onChange(a.title, {
                        client: a.client,
                        campaign: a.campaign,
                      });
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        props.value === a.title ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{a.title}</div>
                      {(a.client || a.campaign) && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {[a.client, a.campaign].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {canUseQueryAsNew && (
                  <CommandItem
                    value={`__new__:${query}`}
                    onSelect={() => {
                      props.onChange(query.trim());
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="text-muted-foreground">Use</span>
                    <span className="font-medium truncate">"{query.trim()}"</span>
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
