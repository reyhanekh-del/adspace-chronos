import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Timeline } from "@/components/dashboard/Timeline";
import { DetailPanel } from "@/components/dashboard/DetailPanel";
import { TopBar, startOfWeek, type CalendarView } from "@/components/dashboard/TopBar";
import { ConflictModal } from "@/components/dashboard/ConflictModal";
import { ScheduleModal } from "@/components/dashboard/ScheduleModal";
import { WeekView } from "@/components/dashboard/WeekView";
import { MonthView } from "@/components/dashboard/MonthView";
import {
  initialBlocks,
  locations,
  screens as allScreens,
  ScheduleBlock,
} from "@/lib/schedule-data";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(initialBlocks);
  const [selectedScreens, setSelectedScreens] = useState<string[]>(allScreens.map((s) => s.id));
  const [selectedLocations, setSelectedLocations] = useState<string[]>(locations);
  const [selectedTypes, setSelectedTypes] = useState<("program" | "adpack")[]>(["program", "adpack"]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date(2026, 4, 7));
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<CalendarView>("day");
  const [conflict, setConflict] = useState<{
    pending: { id: string; screenId: string; startHour: number };
    conflicting: ScheduleBlock[];
  } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<ScheduleBlock | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const visibleScreens = useMemo(
    () =>
      allScreens.filter(
        (s) => selectedScreens.includes(s.id) && selectedLocations.includes(s.location)
      ),
    [selectedScreens, selectedLocations]
  );

  const visibleBlocks = useMemo(
    () =>
      blocks.filter(
        (b) =>
          selectedTypes.includes(b.type) &&
          visibleScreens.some((s) => s.id === b.screenId) &&
          (query === "" ||
            b.title.toLowerCase().includes(query.toLowerCase()) ||
            (b.client ?? "").toLowerCase().includes(query.toLowerCase()))
      ),
    [blocks, selectedTypes, visibleScreens, query]
  );

  const conflictsCount = blocks.filter((b) => b.status === "conflict").length;

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;
  const selectedScreen = selectedBlock
    ? allScreens.find((s) => s.id === selectedBlock.screenId) ?? null
    : null;

  const selectBlock = (b: ScheduleBlock) => setSelectedId(b.id);

  useEffect(() => {
    if (selectedId && !visibleBlocks.some((b) => b.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visibleBlocks, selectedId]);

  const handleMove = (id: string, screenId: string, startHour: number) => {
    const target = blocks.find((b) => b.id === id);
    if (!target) return;
    const duration = target.endHour - target.startHour;
    const newEnd = startHour + duration;

    const conflicting = blocks.filter(
      (b) =>
        b.id !== id &&
        b.screenId === screenId &&
        b.type === target.type &&
        b.status !== "blocked" &&
        startHour < b.endHour &&
        newEnd > b.startHour
    );

    if (conflicting.length > 0) {
      setConflict({ pending: { id, screenId, startHour }, conflicting });
      return;
    }

    applyMove(id, screenId, startHour);
  };

  const applyMove = (id: string, screenId: string, startHour: number, markConflict = false) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const dur = b.endHour - b.startHour;
        return {
          ...b,
          screenId,
          startHour,
          endHour: startHour + dur,
          status: markConflict ? "conflict" : b.status === "conflict" ? "reserved" : b.status,
        };
      })
    );
  };

  const conflictScreen = conflict
    ? allScreens.find((s) => s.id === conflict.pending.screenId) ?? null
    : null;
  const conflictBlock = conflict ? blocks.find((b) => b.id === conflict.pending.id) ?? null : null;

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <TopBar
        date={date}
        view={view}
        onViewChange={setView}
        onPrev={() => setDate(stepDate(date, view, -1))}
        onNext={() => setDate(stepDate(date, view, 1))}
        onToday={() => setDate(new Date())}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        conflicts={conflictsCount}
        onNew={() => {
          setEditorInitial(null);
          setEditorOpen(true);
        }}
        screens={allScreens}
        locations={locations}
        selectedScreens={selectedScreens}
        selectedLocations={selectedLocations}
        selectedTypes={selectedTypes}
        onToggleScreen={(id) =>
          setSelectedScreens((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
        }
        onToggleLocation={(loc) =>
          setSelectedLocations((p) => (p.includes(loc) ? p.filter((x) => x !== loc) : [...p, loc]))
        }
        onToggleType={(t) =>
          setSelectedTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
        }
        query={query}
        onQuery={setQuery}
      />
      <div className="flex flex-1 min-h-0 min-w-0">
        {view === "day" && (
          <Timeline
            screens={visibleScreens}
            blocks={visibleBlocks}
            selectedId={selectedId}
            onSelect={selectBlock}
            onMove={handleMove}
          />
        )}
        {view === "week" && (
          <WeekView
            weekStart={startOfWeek(date)}
            screens={visibleScreens}
            blocks={visibleBlocks}
            selectedId={selectedId}
            onSelect={selectBlock}
            onPickDay={(d) => {
              setDate(d);
              setView("day");
            }}
          />
        )}
        {view === "month" && (
          <MonthView
            monthDate={date}
            blocks={visibleBlocks}
            onPickDay={(d) => {
              setDate(d);
              setView("day");
            }}
          />
        )}
        {selectedBlock && (
          <DetailPanel
            block={selectedBlock}
            screen={selectedScreen}
            onClose={() => setSelectedId(null)}
            onChange={(updated) =>
              setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
            }
            onDelete={(id) => {
              setBlocks((prev) => prev.filter((b) => b.id !== id));
              setSelectedId(null);
            }}
            onEdit={(b) => {
              setEditorInitial(b);
              setEditorOpen(true);
            }}
          />
        )}
      </div>

      <ScheduleModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editorInitial}
        screens={allScreens}
        existingBlocks={blocks}
        anchorDate={date}
        onSave={(saved) => {
          setBlocks((prev) => {
            const ids = new Set(saved.map((b) => b.id));
            const kept = prev.filter((b) => !ids.has(b.id));
            return [...kept, ...saved];
          });
          if (saved[0]) setSelectedId(saved[0].id);
        }}
      />

      <ConflictModal
        open={!!conflict}
        onOpenChange={(b) => !b && setConflict(null)}
        block={conflictBlock}
        conflicting={conflict?.conflicting ?? []}
        screen={conflictScreen}
        onCancel={() => setConflict(null)}
        onForce={() => {
          if (!conflict) return;
          applyMove(conflict.pending.id, conflict.pending.screenId, conflict.pending.startHour, true);
          setConflict(null);
        }}
      />
    </div>
  );
}

function stepDate(date: Date, view: CalendarView, dir: number): Date {
  const d = new Date(date);
  if (view === "month") d.setMonth(d.getMonth() + dir);
  else if (view === "week") d.setDate(d.getDate() + 7 * dir);
  else d.setDate(d.getDate() + dir);
  return d;
}
