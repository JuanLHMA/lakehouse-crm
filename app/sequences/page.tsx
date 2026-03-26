"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Mail,
  Clock,
  Send,
  Pencil,
  Trash2,
  Plus,
  X,
  Check,
} from "lucide-react";
import ProtectedLayout from "@/components/ProtectedLayout";
import PhaseTag from "@/components/PhaseTag";
import { useToast } from "@/components/Toast";
import type { Sequence, SequenceStep } from "@/lib/types";
import type { Lead } from "@/lib/types";

export default function SequencesPage() {
  const { showToast } = useToast();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendModal, setSendModal] = useState<{ sequenceId: string; sequenceName: string } | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [sending, setSending] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Sequence | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchLeads = () =>
    fetch("/api/leads")
      .then((r) => r.json() as Promise<Lead[]>)
      .then(setLeads)
      .catch(console.error);

  useEffect(() => {
    Promise.all([
      fetch("/api/sequences").then((r) => r.json() as Promise<Sequence[]>),
      fetch("/api/leads").then((r) => r.json() as Promise<Lead[]>),
    ])
      .then(([seqs, ldList]) => {
        setSequences(seqs);
        setLeads(ldList);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const toggle = (id: string) => {
    if (editingId === id) return; // don't collapse while editing
    setExpanded((prev) => (prev === id ? null : id));
  };

  const handleSendToLead = async () => {
    if (!sendModal || !selectedLeadId) return;
    setSending(true);
    try {
      const res = await fetch("/api/email/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLeadId, sequenceId: sendModal.sequenceId }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`Sequence "${sendModal.sequenceName}" triggered!`, "success");
      setSendModal(null);
      setSelectedLeadId("");
    } catch {
      showToast("Failed to trigger sequence", "error");
    } finally {
      setSending(false);
    }
  };

  // --- Edit helpers ---
  const startEdit = (seq: Sequence) => {
    setEditingId(seq.id);
    setEditDraft(JSON.parse(JSON.stringify(seq))); // deep clone
    setExpanded(seq.id);
    setExpandedStep(0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setExpandedStep(null);
  };

  const updateDraftStep = (index: number, field: keyof SequenceStep, value: string | number) => {
    if (!editDraft) return;
    const steps = editDraft.steps.map((s, i) =>
      i === index ? { ...s, [field]: field === "day" ? Number(value) : value } : s
    );
    setEditDraft({ ...editDraft, steps });
  };

  const deleteStep = (index: number) => {
    if (!editDraft) return;
    const steps = editDraft.steps.filter((_, i) => i !== index);
    setEditDraft({ ...editDraft, steps });
    setExpandedStep(null);
  };

  const addStep = () => {
    if (!editDraft) return;
    const lastDay = editDraft.steps.length > 0 ? editDraft.steps[editDraft.steps.length - 1].day : 0;
    const newStep: SequenceStep = { day: lastDay + 3, subject: "New Email", body: "" };
    const steps = [...editDraft.steps, newStep];
    setEditDraft({ ...editDraft, steps });
    setExpandedStep(steps.length - 1);
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sequences/${editDraft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDraft.name, steps: editDraft.steps }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json() as Sequence;
      setSequences((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast("Sequence saved!", "success");
      cancelEdit();
    } catch {
      showToast("Failed to save sequence", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedLayout>
      {/* Send to Lead Modal */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] rounded-xl border border-white/15 shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-bold text-white mb-1">Send Sequence to Lead</h2>
            <p className="text-sm text-gray-500 mb-4">{sendModal.sequenceName}</p>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/40 focus:border-[#DC143C]"
            >
              <option value="">Select a lead…</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.email}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleSendToLead}
                disabled={!selectedLeadId || sending}
                className="flex-1 px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 uppercase tracking-wide"
              >
                {sending ? "Sending..." : "Send"}
              </button>
              <button
                onClick={() => { setSendModal(null); setSelectedLeadId(""); }}
                className="px-4 py-2 border border-white/15 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Email Sequences</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Automated email nurture sequences for each phase of the student journey
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const isOpen = expanded === seq.id;
            const isEditing = editingId === seq.id;
            const draft = isEditing ? editDraft! : null;

            return (
              <div
                key={seq.id}
                className={`bg-[#1A1A1A] rounded-xl border overflow-hidden transition-all ${
                  isEditing ? "border-[#DC143C]/50" : "border-white/10 hover:border-white/20"
                }`}
              >
                {/* Header row */}
                <div
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                    isEditing ? "bg-[#DC143C]/5" : "hover:bg-white/5 cursor-pointer"
                  }`}
                  onClick={() => !isEditing && toggle(seq.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#DC143C]/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#DC143C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="font-bold text-white">{seq.name}</h2>
                      <PhaseTag phase={seq.phase} size="sm" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {seq.steps.length} email{seq.steps.length !== 1 ? "s" : ""} ·{" "}
                      {seq.steps[seq.steps.length - 1]?.day ?? 0} days total
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isEditing && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(seq);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 text-gray-300 rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSendModal({ sequenceId: seq.id, sequenceName: seq.name });
                            setSelectedLeadId("");
                            fetchLeads();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#DC143C]/10 text-[#DC143C] rounded-lg text-xs font-semibold hover:bg-[#DC143C]/20 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          Send to Lead
                        </button>
                        {isOpen ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </>
                    )}
                    {isEditing && (
                      <span className="text-xs font-semibold text-[#DC143C] uppercase tracking-wide">
                        Editing
                      </span>
                    )}
                  </div>
                </div>

                {/* ── READ-ONLY VIEW ── */}
                {isOpen && !isEditing && (
                  <div className="border-t border-white/10 px-5 py-4 space-y-4">
                    {seq.steps.map((step, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-12 h-7 rounded-full bg-[#DC143C]/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-[#DC143C]">Day {step.day}</span>
                          </div>
                          {index < seq.steps.length - 1 && (
                            <div className="w-px flex-1 min-h-[32px] bg-white/10 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Subject
                            </span>
                          </div>
                          <p className="font-semibold text-white text-sm mb-2">{step.subject}</p>
                          <div className="bg-black rounded-lg p-3 border border-white/10">
                            <p className="text-sm text-gray-400 whitespace-pre-line leading-relaxed">
                              {step.body}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>Sends on day {step.day} of sequence</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── EDIT VIEW ── */}
                {isEditing && draft && (
                  <div className="border-t border-[#DC143C]/20 px-5 py-4 space-y-3">

                    {/* Step list */}
                    {draft.steps.map((step, index) => {
                      const stepOpen = expandedStep === index;
                      return (
                        <div
                          key={index}
                          className="rounded-lg border border-white/10 overflow-hidden bg-black/40"
                        >
                          {/* Step header (collapsible) */}
                          <button
                            type="button"
                            onClick={() => setExpandedStep(stepOpen ? null : index)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                          >
                            <div className="w-14 h-6 rounded-full bg-[#DC143C]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-[#DC143C]">Day {step.day}</span>
                            </div>
                            <span className="flex-1 text-sm font-medium text-white truncate">
                              {step.subject || "Untitled email"}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); deleteStep(index); }}
                                className="p-1 text-gray-600 hover:text-red-400 transition-colors rounded"
                                title="Delete step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {stepOpen ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                          </button>

                          {/* Step fields */}
                          {stepOpen && (
                            <div className="px-4 pb-4 pt-1 border-t border-white/10 space-y-3">
                              {/* Delay */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                  Send on day
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={step.day}
                                  onChange={(e) => updateDraftStep(index, "day", e.target.value)}
                                  className="w-24 bg-black border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#DC143C]/40 focus:border-[#DC143C]"
                                />
                              </div>
                              {/* Subject */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                  Subject line
                                </label>
                                <input
                                  type="text"
                                  value={step.subject}
                                  onChange={(e) => updateDraftStep(index, "subject", e.target.value)}
                                  placeholder="Email subject…"
                                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#DC143C]/40 focus:border-[#DC143C] placeholder-gray-600"
                                />
                              </div>
                              {/* Body */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                  Email body
                                </label>
                                <textarea
                                  value={step.body}
                                  onChange={(e) => updateDraftStep(index, "body", e.target.value)}
                                  rows={8}
                                  placeholder="Email body… Use {{firstName}}, {{assignedTo}} for personalization."
                                  className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#DC143C]/40 focus:border-[#DC143C] placeholder-gray-600 resize-y font-mono"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add step */}
                    <button
                      type="button"
                      onClick={addStep}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-white/20 rounded-lg text-sm text-gray-500 hover:border-[#DC143C]/40 hover:text-[#DC143C] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add email step
                    </button>

                    {/* Save / Cancel */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#DC143C] text-white rounded-lg text-sm font-bold hover:bg-[#b01030] transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {saving ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 border border-white/15 text-gray-400 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <div className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-300 text-sm">About Email Sequences</h3>
            <p className="text-blue-400/70 text-sm mt-1">
              Each sequence is triggered when a lead enters a new phase. Emails are automatically
              personalized with the lead&apos;s name and assigned staff member. Sequences can be
              paused or customized per lead from the contact detail view.
            </p>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
