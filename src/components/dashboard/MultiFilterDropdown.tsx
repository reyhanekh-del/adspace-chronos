import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
};

export function MultiFilterDropdown({
  label,
  icon,
  options,
  selected,
  onToggle,
  onClear,
}: Props) {
  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-between gap-2 font-normal"
        >
          <span className="flex items-center gap-1.5 truncate">
            {icon}
            <span className="text-muted-foreground">{label}</span>
            <span className="truncate">{summary}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-0.5 pr-2">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/60 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={() => onToggle(opt)}
                />
                <span className="text-sm truncate">{opt}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
