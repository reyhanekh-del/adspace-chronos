import { Fragment } from "react";
import {
  CONFLICT_OVERLAP_DISPLAY_MAX,
  ConflictOverlap,
  formatOverlapLine,
} from "@/lib/schedule-conflicts";

type Props = {
  overlaps: ConflictOverlap[];
  onShowAll: () => void;
};

export function ConflictOverlapsPreview({ overlaps, onShowAll }: Props) {
  if (overlaps.length === 0) return <span>—</span>;

  const shown = overlaps.slice(0, CONFLICT_OVERLAP_DISPLAY_MAX);
  const rest = overlaps.length - shown.length;

  return (
    <span className="text-foreground/90">
      {shown.map((o, i) => (
        <Fragment key={`${o.date}-${o.slotLabel}-${i}`}>
          {i > 0 && ", "}
          {formatOverlapLine(o)}
        </Fragment>
      ))}
      {rest > 0 && (
        <>
          {shown.length > 0 && ", "}
          <button
            type="button"
            onClick={onShowAll}
            className="text-primary font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
          >
            +{rest} more
          </button>
        </>
      )}
    </span>
  );
}
