import { Monitor, MapPin, Layers, Search, Tv, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Screen } from "@/lib/schedule-data";

type Props = {
  screens: Screen[];
  locations: string[];
  selectedScreens: string[];
  selectedLocations: string[];
  selectedTypes: ("program" | "adpack")[];
  onToggleScreen: (id: string) => void;
  onToggleLocation: (loc: string) => void;
  onToggleType: (t: "program" | "adpack") => void;
  query: string;
  onQuery: (s: string) => void;
};

export function NavbarFilters(p: Props) {
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:inline">
        Filters
      </span>

      <div className="flex items-center gap-1 shrink-0 rounded-md border bg-background p-0.5">
        <Button
          type="button"
          variant={p.selectedTypes.includes("program") ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => p.onToggleType("program")}
        >
          <span className="h-2 w-2 rounded-sm bg-slot-program shrink-0" />
          <Tv className="h-3 w-3" />
          Programs
        </Button>
        <Button
          type="button"
          variant={p.selectedTypes.includes("adpack") ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => p.onToggleType("adpack")}
        >
          <span className="h-2 w-2 rounded-sm bg-slot-adpack shrink-0" />
          <Layers className="h-3 w-3" />
          Ads
        </Button>
      </div>

      <FilterPopover
        label="Locations"
        icon={<MapPin className="h-3.5 w-3.5" />}
        count={p.selectedLocations.length}
        total={p.locations.length}
      >
        <ScrollArea className="max-h-56">
          <div className="space-y-0.5 pr-2">
            {p.locations.map((loc) => (
              <FilterCheckRow
                key={loc}
                label={loc}
                checked={p.selectedLocations.includes(loc)}
                onChange={() => p.onToggleLocation(loc)}
                meta={String(p.screens.filter((s) => s.location === loc).length)}
              />
            ))}
          </div>
        </ScrollArea>
      </FilterPopover>

      <FilterPopover
        label="Screens"
        icon={<Monitor className="h-3.5 w-3.5" />}
        count={p.selectedScreens.length}
        total={p.screens.length}
      >
        <ScrollArea className="max-h-56">
          <div className="space-y-0.5 pr-2">
            {p.screens.map((s) => (
              <FilterCheckRow
                key={s.id}
                label={s.name}
                sub={`${s.location} · ${s.resolution}`}
                checked={p.selectedScreens.includes(s.id)}
                onChange={() => p.onToggleScreen(s.id)}
                trailing={
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      s.online ? "bg-emerald-500" : "bg-muted-foreground/40"
                    )}
                  />
                }
              />
            ))}
          </div>
        </ScrollArea>
      </FilterPopover>

      <div className="relative ml-auto shrink-0 w-44 min-w-[9rem]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          placeholder="Search…"
          className="h-7 pl-7 text-xs bg-background"
        />
      </div>
    </div>
  );
}

function FilterPopover({
  label,
  icon,
  count,
  total,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0">
          {icon}
          {label}
          <span className="text-muted-foreground tabular-nums">
            {count}/{total}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function FilterCheckRow({
  label,
  sub,
  checked,
  onChange,
  meta,
  trailing,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: () => void;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/60 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
      </div>
      {meta && <span className="text-[10px] text-muted-foreground">{meta}</span>}
      {trailing}
    </label>
  );
}
