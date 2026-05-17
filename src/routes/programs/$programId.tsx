import { createFileRoute, Link } from "@tanstack/react-router";
import { programs } from "@/lib/schedule-data";
import { ArrowLeft, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/programs/$programId")({
  component: ProgramDetailPage,
});

function ProgramDetailPage() {
  const { programId } = Route.useParams();
  const program = programs.find((p) => p.id === programId);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b bg-card flex items-center px-5 gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to schedule
          </Link>
        </Button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-14 w-14 rounded-full bg-slot-program/20 grid place-items-center mb-4">
          <Tv className="h-7 w-7 text-slot-program" />
        </div>
        <h1 className="font-display text-2xl font-semibold">
          {program?.name ?? "Program"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Program detail page is not built yet. This route is ready for when the full program
          profile is added.
        </p>
        {program && (
          <p className="text-xs text-muted-foreground mt-4 font-mono">ID: {program.id}</p>
        )}
      </main>
    </div>
  );
}
