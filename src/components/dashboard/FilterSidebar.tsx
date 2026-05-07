import { Monitor, MapPin, Layers, Search, Activity, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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

export function FilterSidebar(p: Props) {
  return (
    <aside className="w-72 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 grid place-items-center shadow-sm">
            <Radio className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold leading-none">Adspace</div>
            <div className="text-xs text-muted-foreground mt-1">Scheduling Console</div>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            placeholder="Search schedules…"
            className="pl-8 h-9 bg-background"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-6">
          <FilterGroup icon={<Layers className="h-3.5 w-3.5" />} title="Content Type">
            <FilterRow
              label="Programs"
              swatch="bg-slot-program"
              checked={p.selectedTypes.includes("program")}
              onChange={() => p.onToggleType("program")}
            />
            <FilterRow
              label="AdPacks"
              swatch="bg-slot-adpack"
              checked={p.selectedTypes.includes("adpack")}
              onChange={() => p.onToggleType("adpack")}
            />
          </FilterGroup>

          <Separator />

          <FilterGroup icon={<MapPin className="h-3.5 w-3.5" />} title="Locations" count={p.selectedLocations.length}>
            {p.locations.map((loc) => (
              <FilterRow
                key={loc}
                label={loc}
                checked={p.selectedLocations.includes(loc)}
                onChange={() => p.onToggleLocation(loc)}
                meta={p.screens.filter((s) => s.location === loc).length}
              />
            ))}
          </FilterGroup>

          <Separator />

          <FilterGroup icon={<Monitor className="h-3.5 w-3.5" />} title="Screens" count={p.selectedScreens.length}>
            {p.screens.map((s) => (
              <FilterRow
                key={s.id}
                label={s.name}
                sub={`${s.location} · ${s.resolution}`}
                checked={p.selectedScreens.includes(s.id)}
                onChange={() => p.onToggleScreen(s.id)}
                trailing={
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      s.online ? "bg-emerald-500" : "bg-muted-foreground/40"
                    )}
                  />
                }
              />
            ))}
          </FilterGroup>

          <Separator />

          <FilterGroup icon={<Activity className="h-3.5 w-3.5" />} title="Slot Status">
            <Legend swatch="bg-slot-free" label="Free" />
            <Legend swatch="bg-slot-reserved" label="Reserved" />
            <Legend swatch="bg-slot-blocked" label="Blocked" />
            <Legend swatch="bg-slot-conflict" label="Conflict" />
          </FilterGroup>
        </div>
      </ScrollArea>
    </aside>
  );
}

function FilterGroup({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
        </div>
        {count ? (
          <Badge variant="secondary" className="h-5 text-[10px]">
            {count}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterRow({
  label,
  sub,
  swatch,
  checked,
  onChange,
  meta,
  trailing,
}: {
  label: string;
  sub?: string;
  swatch?: string;
  checked: boolean;
  onChange: () => void;
  meta?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-accent/60 cursor-pointer transition-colors">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {swatch && <span className={cn("h-3 w-3 rounded-sm", swatch)} />}
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
      </div>
      {meta !== undefined && <span className="text-[10px] text-muted-foreground">{meta}</span>}
      {trailing}
    </label>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <span className={cn("h-3 w-3 rounded-sm border border-border/50", swatch)} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
