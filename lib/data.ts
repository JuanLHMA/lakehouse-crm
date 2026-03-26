import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";
import type { Lead, Activity, Sequence, AnalyticsData, Phase } from "./types";
import { PHASES } from "./types";
import { isOverdue } from "./utils";

const redis = Redis.fromEnv();

const KEYS = {
  leads: "crm:leads",
  activities: "crm:activities",
  sequences: "crm:sequences",
};

// Seed data (used on first run when Redis is empty)
const SEED_LEADS: Lead[] = [
  { id: "a1b2c3d4-0001-4000-8000-000000000001", name: "Marcus Rivera", email: "marcus.rivera@gmail.com", phone: "732-555-0101", status: "active", phase: "assess", source: "opus1", instrument: "guitar", age: 14, notes: "Interested in electric guitar. Parent contacted us via Opus1 listing. Dad plays guitar himself.", createdAt: "2026-03-10T10:00:00Z", updatedAt: "2026-03-20T14:30:00Z", assignedTo: "Sarah Johnson", tags: ["parent-contact", "trial-scheduled"], lastContactDate: "2026-03-20T14:30:00Z", nextActionDate: "2026-03-22T10:00:00Z" },
  { id: "a1b2c3d4-0002-4000-8000-000000000002", name: "Sofia Patel", email: "sofia.patel@yahoo.com", phone: "908-555-0202", status: "active", phase: "assess", source: "website", instrument: "violin", age: 8, notes: "Mom reached out through website contact form. Sofia has some prior Suzuki experience.", createdAt: "2026-03-15T09:00:00Z", updatedAt: "2026-03-24T11:00:00Z", assignedTo: "Emily Chen", tags: ["prior-experience"], lastContactDate: "2026-03-24T11:00:00Z", nextActionDate: "2026-03-27T09:00:00Z" },
  { id: "a1b2c3d4-0003-4000-8000-000000000003", name: "Tyler Kowalski", email: "tkowalski@hotmail.com", phone: "201-555-0303", status: "active", phase: "admit", source: "referral", instrument: "drums", age: 17, notes: "Referred by current student Jake Moreno. Very enthusiastic. Has a drum kit at home already.", createdAt: "2026-02-20T08:00:00Z", updatedAt: "2026-03-18T16:00:00Z", assignedTo: "Mike Torres", tags: ["referral", "trial-done", "strong-interest"], lastContactDate: "2026-03-18T16:00:00Z", nextActionDate: "2026-03-20T10:00:00Z" },
  { id: "a1b2c3d4-0004-4000-8000-000000000004", name: "Destiny Williams", email: "destiny.w@gmail.com", phone: "973-555-0404", status: "active", phase: "admit", source: "social", instrument: "vocals", age: 16, notes: "Found us on Instagram. Wants to pursue musical theatre. Has school choir experience.", createdAt: "2026-02-25T10:00:00Z", updatedAt: "2026-03-22T13:00:00Z", assignedTo: "Emily Chen", tags: ["trial-done", "musical-theatre"], lastContactDate: "2026-03-22T13:00:00Z", nextActionDate: "2026-03-23T09:00:00Z" },
  { id: "a1b2c3d4-0005-4000-8000-000000000005", name: "Aiden Nguyen", email: "angyuen99@gmail.com", phone: "732-555-0505", status: "active", phase: "affirm", source: "opus1", instrument: "bass", age: 19, notes: "College student, wants to learn bass to join a band. Flexible schedule on evenings/weekends.", createdAt: "2026-02-05T11:00:00Z", updatedAt: "2026-03-15T10:00:00Z", assignedTo: "David Kim", tags: ["trial-done", "enrollment-pending"], lastContactDate: "2026-03-15T10:00:00Z", nextActionDate: "2026-03-17T10:00:00Z" },
  { id: "a1b2c3d4-0006-4000-8000-000000000006", name: "Carmen Delgado", email: "cdelgado@icloud.com", phone: "908-555-0606", status: "active", phase: "affirm", source: "walk-in", instrument: "keys", age: 35, notes: "Walked in off the street while driving by. Adult learner, complete beginner. Very excited.", createdAt: "2026-02-10T15:00:00Z", updatedAt: "2026-03-20T14:00:00Z", assignedTo: "Sarah Johnson", tags: ["adult-learner", "walk-in", "beginner"], lastContactDate: "2026-03-20T14:00:00Z", nextActionDate: "2026-03-21T11:00:00Z" },
  { id: "a1b2c3d4-0007-4000-8000-000000000007", name: "Jordan Okafor", email: "jordanokafor@gmail.com", phone: "201-555-0707", status: "active", phase: "activate", source: "referral", instrument: "guitar", age: 11, notes: "Parent is a current Lakehouse guitar student. Jordan watched a recital and got inspired.", createdAt: "2026-01-15T09:00:00Z", updatedAt: "2026-03-10T11:00:00Z", assignedTo: "Mike Torres", tags: ["parent-student", "scholarship", "enrolled"], lastContactDate: "2026-03-10T11:00:00Z", nextActionDate: "2026-04-01T09:00:00Z" },
  { id: "a1b2c3d4-0008-4000-8000-000000000008", name: "Priya Sharma", email: "priya.sharma@outlook.com", phone: "973-555-0808", status: "active", phase: "activate", source: "website", instrument: "ukulele", age: 28, notes: "Works from home, wants a creative hobby. Started lessons 3 weeks ago. Progress is great.", createdAt: "2026-01-20T10:00:00Z", updatedAt: "2026-03-18T13:00:00Z", assignedTo: "Sarah Johnson", tags: ["adult-learner", "enrolled", "fast-learner"], lastContactDate: "2026-03-18T13:00:00Z", nextActionDate: "2026-03-19T09:00:00Z" },
  { id: "a1b2c3d4-0009-4000-8000-000000000009", name: "Ethan Bloomfield", email: "ethanbloomfield@gmail.com", phone: "732-555-0909", status: "active", phase: "acclimate", source: "opus1", instrument: "drums", age: 13, notes: "3 months in. Loves it. Parents are pleased. Working toward first recital piece.", createdAt: "2025-12-10T09:00:00Z", updatedAt: "2026-03-20T10:00:00Z", assignedTo: "David Kim", tags: ["enrolled", "recital-prep"], lastContactDate: "2026-03-20T10:00:00Z", nextActionDate: "2026-03-15T09:00:00Z" },
  { id: "a1b2c3d4-0010-4000-8000-000000000010", name: "Leila Hassan", email: "lhassan@gmail.com", phone: "908-555-1010", status: "active", phase: "acclimate", source: "referral", instrument: "keys", age: 10, notes: "Referred by school music teacher. 2 months in, adapting well. Quiet but focused student.", createdAt: "2026-01-05T11:00:00Z", updatedAt: "2026-03-22T12:00:00Z", assignedTo: "Emily Chen", tags: ["enrolled", "teacher-referral"], lastContactDate: "2026-03-22T12:00:00Z", nextActionDate: "2026-03-12T10:00:00Z" },
  { id: "a1b2c3d4-0011-4000-8000-000000000011", name: "Noah Castellano", email: "noah.c@gmail.com", phone: "201-555-1111", status: "active", phase: "accomplish", source: "website", instrument: "guitar", age: 22, notes: "6-month student. Played at spring open mic. Working on fingerpicking and improvisation.", createdAt: "2025-09-15T10:00:00Z", updatedAt: "2026-03-23T15:00:00Z", assignedTo: "Mike Torres", tags: ["enrolled", "performed", "level-2"], lastContactDate: "2026-03-23T15:00:00Z", nextActionDate: "2026-04-05T10:00:00Z" },
  { id: "a1b2c3d4-0012-4000-8000-000000000012", name: "Isabella Ferreira", email: "iferreira@icloud.com", phone: "973-555-1212", status: "active", phase: "accomplish", source: "referral", instrument: "vocals", age: 15, notes: "Performing at spring recital. Strong voice. Instructor suggests competition opportunities.", createdAt: "2025-10-01T09:00:00Z", updatedAt: "2026-03-21T11:00:00Z", assignedTo: "Emily Chen", tags: ["enrolled", "recital-prep", "competition-candidate"], lastContactDate: "2026-03-21T11:00:00Z", nextActionDate: "2026-03-20T09:00:00Z" },
  { id: "a1b2c3d4-0013-4000-8000-000000000013", name: "Benjamin Rossi", email: "ben.rossi@gmail.com", phone: "732-555-1313", status: "active", phase: "adopt", source: "walk-in", instrument: "bass", age: 42, notes: "Long-term student (11 months). Playing in a local cover band. Auto-renews every month.", createdAt: "2025-04-10T10:00:00Z", updatedAt: "2026-03-24T10:00:00Z", assignedTo: "David Kim", tags: ["enrolled", "long-term", "band-member"], lastContactDate: "2026-03-24T10:00:00Z", nextActionDate: "2026-04-10T10:00:00Z" },
  { id: "a1b2c3d4-0014-4000-8000-000000000014", name: "Kayla Thompson", email: "kthompson@yahoo.com", phone: "908-555-1414", status: "active", phase: "adopt", source: "opus1", instrument: "violin", age: 12, notes: "One year in. Top performer. Parents are extremely happy. Potential scholarship candidate.", createdAt: "2025-03-20T09:00:00Z", updatedAt: "2026-03-23T14:00:00Z", assignedTo: "Sarah Johnson", tags: ["enrolled", "scholarship", "long-term", "top-student"], lastContactDate: "2026-03-23T14:00:00Z", nextActionDate: "2026-04-15T09:00:00Z" },
  { id: "a1b2c3d4-0015-4000-8000-000000000015", name: "Darius Mitchell", email: "dmitch@gmail.com", phone: "201-555-1515", status: "converted", phase: "advocate", source: "referral", instrument: "guitar", age: 33, notes: "Multi-year student. Has referred 4 new students. Plays at Lakehouse events. Evangelist!", createdAt: "2024-01-10T10:00:00Z", updatedAt: "2026-03-25T09:00:00Z", assignedTo: "Mike Torres", tags: ["long-term", "advocate", "referred-others", "event-performer"], lastContactDate: "2026-03-25T09:00:00Z", nextActionDate: "2026-04-20T10:00:00Z" },
  { id: "a1b2c3d4-0016-4000-8000-000000000016", name: "Amara Osei", email: "amara.osei@gmail.com", phone: "973-555-1616", status: "converted", phase: "advocate", source: "social", instrument: "keys", age: 45, notes: "Adult student for 2 years. Posts about Lakehouse on social media regularly. Huge ambassador.", createdAt: "2024-03-05T09:00:00Z", updatedAt: "2026-03-24T11:00:00Z", assignedTo: "Emily Chen", tags: ["long-term", "advocate", "social-media-champion"], lastContactDate: "2026-03-24T11:00:00Z", nextActionDate: "2026-04-25T09:00:00Z" },
  { id: "a1b2c3d4-0017-4000-8000-000000000017", name: "Ryan Gallagher", email: "rgallagher@outlook.com", phone: "732-555-1717", status: "inactive", phase: "assess", source: "website", instrument: "guitar", age: 25, notes: "Inquired in January, went cold after initial contact. Sent 3 follow-ups with no response.", createdAt: "2026-01-10T10:00:00Z", updatedAt: "2026-02-15T10:00:00Z", assignedTo: "Sarah Johnson", tags: ["cold-lead", "no-response"], lastContactDate: "2026-02-15T10:00:00Z", nextActionDate: "2026-02-20T09:00:00Z" },
  { id: "a1b2c3d4-0018-4000-8000-000000000018", name: "Maya Johansson", email: "maya.j@gmail.com", phone: "908-555-1818", status: "active", phase: "activate", source: "walk-in", instrument: "ukulele", age: 7, notes: "Adorable 7-year-old who walked in with her grandma. First lesson this week. Very excited!", createdAt: "2026-03-01T10:00:00Z", updatedAt: "2026-03-22T13:00:00Z", assignedTo: "David Kim", tags: ["enrolled", "youth-student", "beginner"], lastContactDate: "2026-03-22T13:00:00Z", nextActionDate: "2026-03-18T09:00:00Z" },
];

const SEED_ACTIVITIES: Activity[] = [
  { id: "act-001", leadId: "a1b2c3d4-0001-4000-8000-000000000001", type: "email", content: "Sent welcome inquiry email sequence - day 0", createdAt: "2026-03-10T10:05:00Z", createdBy: "Sarah Johnson", metadata: { sequenceId: "seq-1", stepDay: 0 } },
  { id: "act-002", leadId: "a1b2c3d4-0001-4000-8000-000000000001", type: "call", content: "Spoke with Marcus's dad. He's interested in Tuesday/Thursday evenings. Will confirm schedule.", createdAt: "2026-03-12T14:00:00Z", createdBy: "Sarah Johnson", metadata: { duration: "8 minutes", outcome: "positive" } },
  { id: "act-003", leadId: "a1b2c3d4-0001-4000-8000-000000000001", type: "note", content: "Trial lesson scheduled for March 22. Dad will drop off at 4pm.", createdAt: "2026-03-15T11:00:00Z", createdBy: "Sarah Johnson", metadata: {} },
  { id: "act-004", leadId: "a1b2c3d4-0002-4000-8000-000000000002", type: "email", content: "Sent welcome inquiry email - mentioned Sofia's Suzuki background.", createdAt: "2026-03-15T09:10:00Z", createdBy: "Emily Chen", metadata: { sequenceId: "seq-1", stepDay: 0 } },
  { id: "act-005", leadId: "a1b2c3d4-0003-4000-8000-000000000003", type: "phase_change", content: "Moved from Assess to Admit after positive trial lesson.", createdAt: "2026-03-10T16:00:00Z", createdBy: "Mike Torres", metadata: { fromPhase: "assess", toPhase: "admit" } },
  { id: "act-006", leadId: "a1b2c3d4-0003-4000-8000-000000000003", type: "call", content: "Called Tyler to discuss enrollment. He wants Saturday morning slots. Checking availability.", createdAt: "2026-03-18T16:00:00Z", createdBy: "Mike Torres", metadata: { duration: "12 minutes", outcome: "follow-up needed" } },
  { id: "act-007", leadId: "a1b2c3d4-0004-4000-8000-000000000004", type: "note", content: "Destiny wants to focus on musical theatre repertoire. Emily matched her with vocal coach.", createdAt: "2026-03-15T13:00:00Z", createdBy: "Emily Chen", metadata: {} },
  { id: "act-008", leadId: "a1b2c3d4-0004-4000-8000-000000000004", type: "phase_change", content: "Trial lesson completed successfully. Moving to Admit phase.", createdAt: "2026-03-22T13:00:00Z", createdBy: "Emily Chen", metadata: { fromPhase: "assess", toPhase: "admit" } },
  { id: "act-009", leadId: "a1b2c3d4-0005-4000-8000-000000000005", type: "phase_change", content: "Enrollment paperwork signed. Moving to Affirm.", createdAt: "2026-03-10T10:00:00Z", createdBy: "David Kim", metadata: { fromPhase: "admit", toPhase: "affirm" } },
  { id: "act-010", leadId: "a1b2c3d4-0005-4000-8000-000000000005", type: "email", content: "Sent enrollment confirmation and student orientation guide.", createdAt: "2026-03-10T10:30:00Z", createdBy: "David Kim", metadata: { sequenceId: "seq-3", stepDay: 1 } },
  { id: "act-011", leadId: "a1b2c3d4-0006-4000-8000-000000000006", type: "note", content: "Carmen is a complete beginner but shows great aptitude. Very motivated adult learner.", createdAt: "2026-03-05T15:00:00Z", createdBy: "Sarah Johnson", metadata: {} },
  { id: "act-012", leadId: "a1b2c3d4-0007-4000-8000-000000000007", type: "phase_change", content: "First month complete. Jordan is thriving. Advancing to Activate.", createdAt: "2026-02-15T11:00:00Z", createdBy: "Mike Torres", metadata: { fromPhase: "affirm", toPhase: "activate" } },
  { id: "act-013", leadId: "a1b2c3d4-0007-4000-8000-000000000007", type: "note", content: "Jordan's parent approved scholarship application. Processing.", createdAt: "2026-03-10T11:00:00Z", createdBy: "Mike Torres", metadata: {} },
  { id: "act-014", leadId: "a1b2c3d4-0008-4000-8000-000000000008", type: "call", content: "Check-in call with Priya. She's loving the ukulele lessons and has been practicing daily.", createdAt: "2026-03-18T13:00:00Z", createdBy: "Sarah Johnson", metadata: { duration: "6 minutes", outcome: "very positive" } },
  { id: "act-015", leadId: "a1b2c3d4-0009-4000-8000-000000000009", type: "note", content: "Ethan is working on his recital piece - Wipe Out. Instructor says he's almost ready.", createdAt: "2026-03-20T10:00:00Z", createdBy: "David Kim", metadata: {} },
  { id: "act-016", leadId: "a1b2c3d4-0009-4000-8000-000000000009", type: "phase_change", content: "Settling in well after 3 months. Advancing to Acclimate.", createdAt: "2026-03-01T09:00:00Z", createdBy: "David Kim", metadata: { fromPhase: "activate", toPhase: "acclimate" } },
  { id: "act-017", leadId: "a1b2c3d4-0010-4000-8000-000000000010", type: "email", content: "Sent monthly engagement email with upcoming events and practice tips.", createdAt: "2026-03-22T12:00:00Z", createdBy: "Emily Chen", metadata: { sequenceId: "seq-5", stepDay: 0 } },
  { id: "act-018", leadId: "a1b2c3d4-0011-4000-8000-000000000011", type: "note", content: "Noah performed at open mic night. Got a standing ovation! Incredible progress.", createdAt: "2026-03-05T20:00:00Z", createdBy: "Mike Torres", metadata: {} },
  { id: "act-019", leadId: "a1b2c3d4-0011-4000-8000-000000000011", type: "phase_change", content: "Completing milestones. Advancing to Accomplish phase.", createdAt: "2026-03-01T10:00:00Z", createdBy: "Mike Torres", metadata: { fromPhase: "acclimate", toPhase: "accomplish" } },
  { id: "act-020", leadId: "a1b2c3d4-0012-4000-8000-000000000012", type: "email", content: "Sent spring recital registration details to Isabella and her parents.", createdAt: "2026-03-21T11:00:00Z", createdBy: "Emily Chen", metadata: { sequenceId: "seq-6", stepDay: 5 } },
  { id: "act-021", leadId: "a1b2c3d4-0013-4000-8000-000000000013", type: "call", content: "Monthly check-in with Ben. He's performing with his cover band next month at The Stone Pony!", createdAt: "2026-03-24T10:00:00Z", createdBy: "David Kim", metadata: { duration: "15 minutes", outcome: "excellent" } },
  { id: "act-022", leadId: "a1b2c3d4-0013-4000-8000-000000000013", type: "phase_change", content: "Long-term committed student. Moved to Adopt.", createdAt: "2026-01-10T10:00:00Z", createdBy: "David Kim", metadata: { fromPhase: "accomplish", toPhase: "adopt" } },
  { id: "act-023", leadId: "a1b2c3d4-0014-4000-8000-000000000014", type: "note", content: "Kayla's parents asked about scholarship renewal. Confirmed through end of year.", createdAt: "2026-03-23T14:00:00Z", createdBy: "Sarah Johnson", metadata: {} },
  { id: "act-024", leadId: "a1b2c3d4-0015-4000-8000-000000000015", type: "email", content: "Sent referral rewards program details. He's already referred 2 leads this month!", createdAt: "2026-03-20T09:00:00Z", createdBy: "Mike Torres", metadata: { sequenceId: "seq-8", stepDay: 14 } },
  { id: "act-025", leadId: "a1b2c3d4-0015-4000-8000-000000000015", type: "phase_change", content: "Darius is now an advocate — referring students and playing events.", createdAt: "2025-12-01T10:00:00Z", createdBy: "Mike Torres", metadata: { fromPhase: "adopt", toPhase: "advocate" } },
  { id: "act-026", leadId: "a1b2c3d4-0016-4000-8000-000000000016", type: "note", content: "Amara posted a 5-star Google review and tagged Lakehouse on Instagram. Incredible advocate.", createdAt: "2026-03-24T11:00:00Z", createdBy: "Emily Chen", metadata: {} },
  { id: "act-027", leadId: "a1b2c3d4-0017-4000-8000-000000000017", type: "email", content: "Third follow-up email sent — no response. Marking as inactive.", createdAt: "2026-02-15T10:00:00Z", createdBy: "Sarah Johnson", metadata: {} },
  { id: "act-028", leadId: "a1b2c3d4-0018-4000-8000-000000000018", type: "phase_change", content: "Enrolled and started first lesson. Moving from Affirm to Activate.", createdAt: "2026-03-08T10:00:00Z", createdBy: "David Kim", metadata: { fromPhase: "affirm", toPhase: "activate" } },
  { id: "act-029", leadId: "a1b2c3d4-0018-4000-8000-000000000018", type: "call", content: "Called Maya's grandma after first lesson. Maya loved it and asked when she can come back!", createdAt: "2026-03-22T13:00:00Z", createdBy: "David Kim", metadata: { duration: "5 minutes", outcome: "delighted" } },
  { id: "act-030", leadId: "a1b2c3d4-0006-4000-8000-000000000006", type: "phase_change", content: "Trial was a success! Carmen signed up on the spot. Moving to Affirm.", createdAt: "2026-02-28T16:00:00Z", createdBy: "Sarah Johnson", metadata: { fromPhase: "admit", toPhase: "affirm" } },
];

// Auto-seed helper: returns cached data or seeds Redis on first use
async function getOrSeed<T>(key: string, seedData: T[]): Promise<T[]> {
  const data = await redis.get<T[]>(key);
  if (data !== null) return data;
  await redis.set(key, seedData);
  return seedData;
}

async function setArray<T>(key: string, data: T[]): Promise<void> {
  await redis.set(key, data);
}

// Leads
export async function getLeads(): Promise<Lead[]> {
  return getOrSeed<Lead>(KEYS.leads, SEED_LEADS);
}

export async function getLead(id: string): Promise<Lead | null> {
  const leads = await getLeads();
  return leads.find((l) => l.id === id) ?? null;
}

export async function createLead(data: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<Lead> {
  const leads = await getLeads();
  const now = new Date().toISOString();
  const newLead: Lead = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  leads.push(newLead);
  await setArray(KEYS.leads, leads);
  return newLead;
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead | null> {
  const leads = await getLeads();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return null;
  const updated: Lead = {
    ...leads[index],
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  };
  leads[index] = updated;
  await setArray(KEYS.leads, leads);
  return updated;
}

export async function deleteLead(id: string): Promise<boolean> {
  const leads = await getLeads();
  const filtered = leads.filter((l) => l.id !== id);
  if (filtered.length === leads.length) return false;
  await setArray(KEYS.leads, filtered);
  return true;
}

// Activities
export async function getActivities(leadId?: string): Promise<Activity[]> {
  const activities = await getOrSeed<Activity>(KEYS.activities, SEED_ACTIVITIES);
  if (leadId) {
    return activities
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createActivity(data: Omit<Activity, "id" | "createdAt">): Promise<Activity> {
  const activities = await getOrSeed<Activity>(KEYS.activities, SEED_ACTIVITIES);
  const newActivity: Activity = {
    ...data,
    id: `act-${uuidv4()}`,
    createdAt: new Date().toISOString(),
  };
  activities.push(newActivity);
  await setArray(KEYS.activities, activities);
  return newActivity;
}

// Sequences
export async function getSequences(): Promise<Sequence[]> {
  const data = await redis.get<Sequence[]>(KEYS.sequences);
  return data ?? [];
}

// Analytics
export async function getAnalytics(): Promise<AnalyticsData> {
  const leads = await getLeads();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalLeads = leads.length;
  const activeLeads = leads.filter((l) => l.status === "active").length;
  const convertedLeads = leads.filter((l) => l.status === "converted").length;
  const inactiveLeads = leads.filter((l) => l.status === "inactive").length;

  const leadsByPhase = PHASES.reduce((acc, phase) => {
    acc[phase] = leads.filter((l) => l.phase === phase).length;
    return acc;
  }, {} as Record<Phase, number>);

  const leadsBySource = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadsByAssignee = leads.reduce((acc, lead) => {
    acc[lead.assignedTo] = (acc[lead.assignedTo] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const overdueLeads = leads.filter(isOverdue).length;

  const newLeadsThisWeek = leads.filter(
    (l) => new Date(l.createdAt) >= oneWeekAgo
  ).length;

  const avgDaysInPhase = PHASES.reduce((acc, phase) => {
    const phaseLeads = leads.filter((l) => l.phase === phase);
    if (phaseLeads.length === 0) {
      acc[phase] = 0;
      return acc;
    }
    const totalDays = phaseLeads.reduce((sum, lead) => {
      const updated = new Date(lead.updatedAt);
      const diff = now.getTime() - updated.getTime();
      return sum + Math.floor(diff / (1000 * 60 * 60 * 24));
    }, 0);
    acc[phase] = Math.round(totalDays / phaseLeads.length);
    return acc;
  }, {} as Record<Phase, number>);

  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return {
    totalLeads,
    activeLeads,
    convertedLeads,
    inactiveLeads,
    leadsByPhase,
    leadsBySource,
    leadsByAssignee,
    overdueLeads,
    newLeadsThisWeek,
    avgDaysInPhase,
    conversionRate,
  };
}
