"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, Filter, ChevronRight } from "lucide-react";
import ProtectedLayout from "@/components/ProtectedLayout";
import PhaseTag from "@/components/PhaseTag";
import ContactForm from "@/components/ContactForm";
import { formatInstrument, formatDate, isOverdue } from "@/lib/utils";
import type { Lead, Phase } from "@/lib/types";
import { PHASES } from "@/lib/types";

const instrumentEmoji: Record<string, string> = {
  guitar: "🎸",
  drums: "🥁",
  bass: "🎸",
  vocals: "🎤",
  keys: "🎹",
  violin: "🎻",
  ukulele: "🪗",
};

export default function ContactsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (phaseFilter) params.set("phase", phaseFilter);
      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json() as Lead[];
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLeads();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, phaseFilter]);

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
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} leads found</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-[#DC143C] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#B01030] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, instrument..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="text-sm text-gray-700 bg-transparent focus:outline-none"
          >
            <option value="">All phases</option>
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Search className="w-8 h-8 mb-2" />
            <p className="text-sm">No contacts found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden md:table-cell">Instrument</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Phase</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden lg:table-cell">Assigned To</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden lg:table-cell">Last Contact</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 hidden xl:table-cell">Next Action</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => {
                const overdue = isOverdue(lead);
                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${lead.id}`} className="block">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#DC143C]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[#DC143C]">
                              {lead.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-[#DC143C] transition-colors">
                              {lead.name}
                            </p>
                            <p className="text-xs text-gray-400">{lead.email}</p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span>{instrumentEmoji[lead.instrument]}</span>
                        <span className="text-sm text-gray-600">{formatInstrument(lead.instrument)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PhaseTag phase={lead.phase} size="sm" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{lead.assignedTo}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-500">{formatDate(lead.lastContactDate)}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span
                        className={`text-sm font-medium ${
                          overdue ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        {overdue ? "⚠️ " : ""}{formatDate(lead.nextActionDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${lead.id}`}>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#DC143C] transition-colors" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </ProtectedLayout>
  );
}
