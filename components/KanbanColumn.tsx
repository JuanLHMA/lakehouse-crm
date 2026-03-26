"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, formatPhase } from "@/lib/utils";
import LeadCard from "./LeadCard";
import type { Lead, Phase } from "@/lib/types";

function SortableLeadCard({ lead }: { lead: Lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} isDragging={isDragging} />
    </div>
  );
}

interface KanbanColumnProps {
  phase: Phase;
  leads: Lead[];
}

export default function KanbanColumn({ phase, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: phase });

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] flex-shrink-0">
      {/* Column Header */}
      <div className="px-3 py-2.5 rounded-t-xl border border-b-0 border-white/10 bg-[#111] flex items-center justify-between">
        <h2 className="font-semibold text-sm text-white">{formatPhase(phase)}</h2>
        <span className="text-xs font-bold bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/10">
          {leads.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[400px] rounded-b-xl border border-t-0 p-2 flex flex-col gap-2 transition-colors",
          isOver ? "bg-[#DC143C]/10 border-[#DC143C]/30" : "bg-[#0A0A0A] border-white/10"
        )}
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-600 text-center py-4">
              No leads in {formatPhase(phase)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
