export type Phase =
  | "assess"
  | "admit"
  | "affirm"
  | "activate"
  | "acclimate"
  | "accomplish"
  | "adopt"
  | "advocate";

export type LeadStatus = "active" | "inactive" | "converted";

export type LeadSource = "opus1" | "website" | "referral" | "walk-in" | "social";

export type Instrument =
  | "guitar"
  | "drums"
  | "bass"
  | "vocals"
  | "keys"
  | "violin"
  | "ukulele";

export type ActivityType = "call" | "email" | "note" | "phase_change" | "task";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  phase: Phase;
  source: LeadSource;
  instrument: Instrument;
  age: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: string;
  tags: string[];
  lastContactDate: string;
  nextActionDate: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  content: string;
  createdAt: string;
  createdBy: string;
  metadata: Record<string, unknown>;
}

export interface SequenceStep {
  day: number;
  subject: string;
  body: string;
}

export interface Sequence {
  id: string;
  phase: Phase;
  name: string;
  steps: SequenceStep[];
}

export interface AnalyticsData {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  inactiveLeads: number;
  leadsByPhase: Record<Phase, number>;
  leadsBySource: Record<string, number>;
  leadsByAssignee: Record<string, number>;
  overdueLeads: number;
  newLeadsThisWeek: number;
  avgDaysInPhase: Record<Phase, number>;
  conversionRate: number;
}

export const PHASES: Phase[] = [
  "assess",
  "admit",
  "affirm",
  "activate",
  "acclimate",
  "accomplish",
  "adopt",
  "advocate",
];

export const ASSIGNEES = [
  "Sarah Johnson",
  "Mike Torres",
  "Emily Chen",
  "David Kim",
];

export const INSTRUMENTS: Instrument[] = [
  "guitar",
  "drums",
  "bass",
  "vocals",
  "keys",
  "violin",
  "ukulele",
];

export const SOURCES: LeadSource[] = [
  "opus1",
  "website",
  "referral",
  "walk-in",
  "social",
];
