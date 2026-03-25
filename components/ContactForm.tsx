"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Lead, Phase, Instrument, LeadSource } from "@/lib/types";
import { PHASES, INSTRUMENTS, SOURCES, ASSIGNEES } from "@/lib/types";
import { formatPhase, formatInstrument, formatSource } from "@/lib/utils";
import { useToast } from "./Toast";

interface ContactFormProps {
  lead?: Lead;
  onClose: () => void;
  onSave: (lead: Lead) => void;
}

const defaultForm = {
  name: "",
  email: "",
  phone: "",
  status: "active" as Lead["status"],
  phase: "assess" as Phase,
  source: "website" as LeadSource,
  instrument: "guitar" as Instrument,
  age: "",
  notes: "",
  assignedTo: "Sarah Johnson",
  tags: "",
  nextActionDate: "",
};

export default function ContactForm({ lead, onClose, onSave }: ContactFormProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: lead?.name ?? defaultForm.name,
    email: lead?.email ?? defaultForm.email,
    phone: lead?.phone ?? defaultForm.phone,
    status: lead?.status ?? defaultForm.status,
    phase: lead?.phase ?? defaultForm.phase,
    source: lead?.source ?? defaultForm.source,
    instrument: lead?.instrument ?? defaultForm.instrument,
    age: lead?.age?.toString() ?? defaultForm.age,
    notes: lead?.notes ?? defaultForm.notes,
    assignedTo: lead?.assignedTo ?? defaultForm.assignedTo,
    tags: lead?.tags?.join(", ") ?? defaultForm.tags,
    nextActionDate: lead?.nextActionDate
      ? new Date(lead.nextActionDate).toISOString().split("T")[0]
      : defaultForm.nextActionDate,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      showToast("Name and email are required", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        age: parseInt(form.age) || 0,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        nextActionDate: form.nextActionDate
          ? new Date(form.nextActionDate).toISOString()
          : new Date().toISOString(),
        lastContactDate: new Date().toISOString(),
      };

      const url = lead ? `/api/leads/${lead.id}` : "/api/leads";
      const method = lead ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json() as Lead;
      showToast(lead ? "Contact updated!" : "Contact created!", "success");
      onSave(saved);
    } catch {
      showToast("Failed to save contact", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {lead ? "Edit Contact" : "New Contact"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                placeholder="Marcus Rivera"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                placeholder="name@email.com"
              />
            </div>
          </div>

          {/* Phone + Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                placeholder="732-555-0100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                placeholder="14"
                min="1"
                max="100"
              />
            </div>
          </div>

          {/* Instrument + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Instrument</label>
              <select
                value={form.instrument}
                onChange={(e) => setForm({ ...form, instrument: e.target.value as Instrument })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              >
                {INSTRUMENTS.map((inst) => (
                  <option key={inst} value={inst}>{formatInstrument(inst)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              >
                {SOURCES.map((src) => (
                  <option key={src} value={src}>{formatSource(src)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phase + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phase</label>
              <select
                value={form.phase}
                onChange={(e) => setForm({ ...form, phase: e.target.value as Phase })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              >
                {PHASES.map((p) => (
                  <option key={p} value={p}>{formatPhase(p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Lead["status"] })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="converted">Converted</option>
              </select>
            </div>
          </div>

          {/* Assigned To + Next Action */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned To</label>
              <select
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              >
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Next Action Date</label>
              <input
                type="date"
                value={form.nextActionDate}
                onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              placeholder="trial-done, parent-contact"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] resize-none"
              placeholder="Any relevant notes about this student..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#DC143C] text-white rounded-lg text-sm font-medium hover:bg-[#B01030] transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : lead ? "Save Changes" : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
