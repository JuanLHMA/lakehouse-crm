import { type Phase, type Lead } from "./types";

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getPhaseColor(phase: Phase): string {
  const colors: Record<Phase, string> = {
    assess: "bg-slate-100 text-slate-700 border-slate-300",
    admit: "bg-blue-100 text-blue-700 border-blue-300",
    affirm: "bg-violet-100 text-violet-700 border-violet-300",
    activate: "bg-amber-100 text-amber-700 border-amber-300",
    acclimate: "bg-orange-100 text-orange-700 border-orange-300",
    accomplish: "bg-emerald-100 text-emerald-700 border-emerald-300",
    adopt: "bg-teal-100 text-teal-700 border-teal-300",
    advocate: "bg-rose-100 text-rose-700 border-rose-300",
  };
  return colors[phase] ?? "bg-gray-100 text-gray-700 border-gray-300";
}

export function getPhaseBorderColor(phase: Phase): string {
  const colors: Record<Phase, string> = {
    assess: "border-l-slate-400",
    admit: "border-l-blue-400",
    affirm: "border-l-violet-400",
    activate: "border-l-amber-400",
    acclimate: "border-l-orange-400",
    accomplish: "border-l-emerald-400",
    adopt: "border-l-teal-400",
    advocate: "border-l-rose-400",
  };
  return colors[phase] ?? "border-l-gray-400";
}

export function getPhaseHeaderColor(phase: Phase): string {
  const colors: Record<Phase, string> = {
    assess: "bg-slate-50 border-slate-200",
    admit: "bg-blue-50 border-blue-200",
    affirm: "bg-violet-50 border-violet-200",
    activate: "bg-amber-50 border-amber-200",
    acclimate: "bg-orange-50 border-orange-200",
    accomplish: "bg-emerald-50 border-emerald-200",
    adopt: "bg-teal-50 border-teal-200",
    advocate: "bg-rose-50 border-rose-200",
  };
  return colors[phase] ?? "bg-gray-50 border-gray-200";
}

export function getDaysInPhase(lead: Lead): number {
  const updated = new Date(lead.updatedAt);
  const now = new Date();
  const diff = now.getTime() - updated.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(lead: Lead): boolean {
  if (!lead.nextActionDate) return false;
  return new Date(lead.nextActionDate) < new Date();
}

export function getUrgencyLevel(lead: Lead): "green" | "yellow" | "red" {
  if (!lead.nextActionDate) return "green";
  const now = new Date();
  const nextAction = new Date(lead.nextActionDate);
  const diffDays = (nextAction.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "red";
  if (diffDays <= 2) return "yellow";
  return "green";
}

export function getUrgencyBorderClass(lead: Lead): string {
  const urgency = getUrgencyLevel(lead);
  if (urgency === "red") return "border-l-red-500";
  if (urgency === "yellow") return "border-l-amber-400";
  return getPhaseBorderColor(lead.phase);
}

export function formatPhase(phase: Phase): string {
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

export function formatSource(source: string): string {
  const map: Record<string, string> = {
    opus1: "Opus1",
    website: "Website",
    referral: "Referral",
    "walk-in": "Walk-In",
    social: "Social Media",
  };
  return map[source] ?? source;
}

export function formatInstrument(instrument: string): string {
  return instrument.charAt(0).toUpperCase() + instrument.slice(1);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    call: "📞",
    email: "✉️",
    note: "📝",
    phase_change: "🔄",
    task: "✅",
  };
  return icons[type] ?? "📌";
}

export function getActivityLabel(type: string): string {
  const labels: Record<string, string> = {
    call: "Phone Call",
    email: "Email Sent",
    note: "Note Added",
    phase_change: "Phase Changed",
    task: "Task",
  };
  return labels[type] ?? type;
}
