"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import { UserPlus, Filter } from "lucide-react";
import ProtectedLayout from "@/components/ProtectedLayout";
import KanbanColumn from "@/components/KanbanColumn";
import LeadCard from "@/components/LeadCard";
import ContactForm from "@/components/ContactForm";
import { useToast } from "@/components/Toast";
import type { Lead, Phase } from "@/lib/types";
import { PHASES } from "@/lib/types";

export default function PipelinePage() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [loading, setLoading] = useState(true);

  const loadLeads = useCallback(async () => {
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/leads${params}`);
      const data = await res.json() as Lead[];
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Kanban drops need to land on the right column even when:
  //  - target column is empty (no sortable cards to attract closestCorners)
  //  - another column (e.g. Activate with 689 cards) has a huge bounding box
  //    that would otherwise be the closest corner from anywhere on screen.
  // Use pointerWithin (pointer must be inside a droppable) and fall back to
  // rectIntersection only if the pointer isn't directly over any column.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    const rectHits = rectIntersection(args);
    return rectHits.length > 0 ? rectHits : [];
  };

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // over.id is the column phase only when the drop lands on an empty column.
    // If the column has cards, closestCorners returns the nearest card's UUID;
    // resolve it to that card's phase so we move to the right column instead
    // of corrupting `phase` with a UUID.
    const phaseSet = PHASES as readonly string[];
    let newPhase: Phase;
    if (phaseSet.includes(overId)) {
      newPhase = overId as Phase;
    } else {
      const overLead = leads.find((l) => l.id === overId);
      if (!overLead) return;
      newPhase = overLead.phase;
    }

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.phase === newPhase) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, phase: newPhase } : l))
    );

    try {
      // Update lead phase
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: newPhase }),
      });

      // Log phase change activity
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          type: "phase_change",
          content: `Moved from ${lead.phase} to ${newPhase} via drag-and-drop`,
          createdBy: "Staff",
          metadata: { fromPhase: lead.phase, toPhase: newPhase },
        }),
      });

      showToast(`Moved ${lead.name} to ${newPhase}`, "success");
    } catch {
      // Revert on error
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, phase: lead.phase } : l))
      );
      showToast("Failed to move lead", "error");
    }
  };

  const getLeadsByPhase = (phase: Phase) =>
    leads.filter((l) => l.phase === phase);

  return (
    <ProtectedLayout>
      {showAddForm && (
        <ContactForm
          onClose={() => setShowAddForm(false)}
          onSave={() => {
            setShowAddForm(false);
            void loadLeads();
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {leads.length} leads across {PHASES.length} phases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#1A1A1A] border border-white/15 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm text-gray-300 bg-transparent focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="converted">Converted</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors uppercase tracking-wide"
          >
            <UserPlus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 min-w-max">
              {PHASES.map((phase) => (
                <KanbanColumn
                  key={phase}
                  phase={phase}
                  leads={getLeadsByPhase(phase)}
                />
              ))}
            </div>
            <DragOverlay>
              {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </ProtectedLayout>
  );
}
