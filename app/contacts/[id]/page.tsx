"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  User,
  Music,
  Calendar,
  Tag,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import ProtectedLayout from "@/components/ProtectedLayout";
import PhaseTag from "@/components/PhaseTag";
import ContactForm from "@/components/ContactForm";
import { useToast } from "@/components/Toast";
import {
  formatDate,
  formatRelativeDate,
  formatInstrument,
  formatSource,
  getActivityIcon,
  getActivityLabel,
  isOverdue,
  formatPhase,
} from "@/lib/utils";
import type { Lead, Activity, Phase } from "@/lib/types";
import { PHASES } from "@/lib/types";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [logType, setLogType] = useState<"call" | "email" | "note">("note");
  const [changingPhase, setChangingPhase] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [leadRes, activitiesRes] = await Promise.all([
        fetch(`/api/leads/${id}`),
        fetch(`/api/activities?leadId=${id}`),
      ]);
      const [leadData, activitiesData] = await Promise.all([
        leadRes.json() as Promise<Lead>,
        activitiesRes.json() as Promise<Activity[]>,
      ]);
      setLead(leadData);
      setActivities(activitiesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePhaseChange = async (newPhase: Phase) => {
    if (!lead || lead.phase === newPhase) return;
    setChangingPhase(true);
    try {
      const oldPhase = lead.phase;
      await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: newPhase }),
      });
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          type: "phase_change",
          content: `Phase changed from ${formatPhase(oldPhase)} to ${formatPhase(newPhase)}`,
          createdBy: "Staff",
          metadata: { fromPhase: oldPhase, toPhase: newPhase },
        }),
      });
      showToast(`Moved to ${formatPhase(newPhase)}`, "success");
      await loadData();
    } catch {
      showToast("Failed to change phase", "error");
    } finally {
      setChangingPhase(false);
    }
  };

  const handleLogActivity = async () => {
    if (!noteText.trim()) return;
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: id,
          type: logType,
          content: noteText.trim(),
          createdBy: "Staff",
          metadata: {},
        }),
      });
      // Update last contact date
      await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastContactDate: new Date().toISOString() }),
      });
      showToast("Activity logged!", "success");
      setNoteText("");
      setShowAddNote(false);
      await loadData();
    } catch {
      showToast("Failed to log activity", "error");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${lead?.name}? This cannot be undone.`)) return;
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
      showToast("Contact deleted", "info");
      router.push("/contacts");
    } catch {
      showToast("Failed to delete contact", "error");
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
        </div>
      </ProtectedLayout>
    );
  }

  if (!lead) {
    return (
      <ProtectedLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Contact not found.</p>
          <Link href="/contacts" className="text-[#DC143C] text-sm mt-2 inline-block">
            Back to Contacts
          </Link>
        </div>
      </ProtectedLayout>
    );
  }

  const overdue = isOverdue(lead);

  return (
    <ProtectedLayout>
      {showEditForm && (
        <ContactForm
          lead={lead}
          onClose={() => setShowEditForm(false)}
          onSave={(updated) => {
            setLead(updated);
            setShowEditForm(false);
          }}
        />
      )}

      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/contacts"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Contacts
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 border border-red-200 bg-white text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left column: Contact info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#DC143C]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-[#DC143C]">
                  {lead.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-gray-900">{lead.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <PhaseTag phase={lead.phase} />
                  {overdue && (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div className="mb-4">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  lead.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : lead.status === "converted"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    lead.status === "active"
                      ? "bg-emerald-500"
                      : lead.status === "converted"
                      ? "bg-blue-500"
                      : "bg-gray-400"
                  }`}
                />
                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-sm">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <a href={`mailto:${lead.email}`} className="text-gray-700 hover:text-[#DC143C] transition-colors truncate">
                  {lead.email}
                </a>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a href={`tel:${lead.phone}`} className="text-gray-700 hover:text-[#DC143C] transition-colors">
                    {lead.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm">
                <Music className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{formatInstrument(lead.instrument)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">Age {lead.age}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">Source: {formatSource(lead.source)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">Assigned: {lead.assignedTo}</span>
              </div>
            </div>

            {/* Tags */}
            {lead.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Last contact</span>
                <span className="text-gray-600 font-medium">{formatDate(lead.lastContactDate)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Next action</span>
                <span className={`font-medium ${overdue ? "text-red-600" : "text-gray-600"}`}>
                  {overdue ? "⚠️ " : ""}{formatDate(lead.nextActionDate)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-600 font-medium">{formatDate(lead.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Phase Change */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Change Phase</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {PHASES.map((phase) => (
                <button
                  key={phase}
                  onClick={() => handlePhaseChange(phase)}
                  disabled={changingPhase || lead.phase === phase}
                  className={`text-xs px-2 py-1.5 rounded-lg font-medium transition-colors ${
                    lead.phase === phase
                      ? "bg-[#DC143C] text-white cursor-default"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {formatPhase(phase)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Right column: Activity Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Action bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-bold text-gray-900">Log Activity</h3>
            </div>
            <div className="flex gap-2 mb-3">
              {(["call", "email", "note"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setLogType(type);
                    setShowAddNote(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    showAddNote && logType === type
                      ? "bg-[#DC143C] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>
                    {type === "call" ? "📞" : type === "email" ? "✉️" : "📝"}
                  </span>
                  {type === "call" ? "Log Call" : type === "email" ? "Log Email" : "Add Note"}
                </button>
              ))}
            </div>

            {showAddNote && (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={
                    logType === "call"
                      ? "Call notes, outcome, follow-up needed..."
                      : logType === "email"
                      ? "Email subject and summary..."
                      : "Notes about this student..."
                  }
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleLogActivity}
                    disabled={!noteText.trim()}
                    className="px-4 py-2 bg-[#DC143C] text-white rounded-lg text-xs font-semibold hover:bg-[#B01030] transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowAddNote(false);
                      setNoteText("");
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Activity Timeline</h3>
              <span className="text-xs text-gray-400">{activities.length} events</span>
            </div>

            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Calendar className="w-8 h-8 mb-2" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="flex gap-3 group">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-base mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      {index < activities.length - 1 && (
                        <div className="w-px h-full min-h-[20px] bg-gray-100 my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">
                          {getActivityLabel(activity.type)}
                        </span>
                        <span className="text-xs text-gray-400">
                          by {activity.createdBy}
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">
                          {formatRelativeDate(activity.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {activity.content}
                      </p>
                      {activity.type === "phase_change" && activity.metadata && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {String(activity.metadata.fromPhase ?? "")}
                          </span>
                          <span className="text-xs text-gray-400">→</span>
                          <span className="text-xs font-medium text-[#DC143C]">
                            {String(activity.metadata.toPhase ?? "")}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
