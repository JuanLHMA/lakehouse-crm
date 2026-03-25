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
  closestCorners,
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

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newPhase = over.id as Phase;

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
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {leads.length} leads across {PHASES.length} phases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm text-gray-700 bg-transparent focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="converted">Converted</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-[#DC143C] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#B01030] transition-colors"
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
            collisionDetection={closestCorners}
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
