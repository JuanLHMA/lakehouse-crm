import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";
import type { Lead, Activity, Sequence, AnalyticsData, Phase } from "./types";
import { PHASES } from "./types";
import { isOverdue } from "./utils";

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? "").trim(),
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),
  readYourWrites: true,
});

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

// Auto-seed helper: returns existing data or seeds Redis on first run.
// Checks for null (key not found) — NOT array length — so leads added
// after seeding are never lost by an accidental re-seed.
async function getOrSeed<T>(key: string, seedData: T[]): Promise<T[]> {
  const data = await redis.get<T[]>(key);
  if (data !== null) return data; // key exists; return as-is regardless of length
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
  const newLead = {
    status: "active",
    phase: "assess",
    tags: [],
    lastContactDate: now,
    nextActionDate: now,
    ...(data as Partial<Lead>),
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  } as Lead;
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

// Seed sequences for all 8 Coleman phases
const SEED_SEQUENCES: Sequence[] = [
  {
    id: "seq-1",
    phase: "assess",
    name: "Lead Inquiry — Welcome Sequence",
    steps: [
      {
        day: 0,
        subject: "Welcome to Lakehouse Music Academy!",
        body: `Hi {{firstName}},

Thank you so much for reaching out to Lakehouse Music Academy — we're thrilled you found us!

We're not your average music school. At Lakehouse, every student gets a personalized learning experience with hand-picked instructors who are as passionate about teaching as they are about music. Whether you're a complete beginner or a seasoned player looking to level up, we meet you exactly where you are.

Here's what makes us different:
🎸 Private lessons tailored to your goals and pace
🎤 Programs for all ages — kids, teens, and adults
🎵 Instruments: guitar, drums, bass, vocals, keys, violin, and ukulele
🎪 The Big Gig — our flagship student showcase (it's epic)

Ready to book your FREE trial lesson? Just reply to this email or visit our website to pick a time that works for you.

We can't wait to be part of your musical journey!

Warmly,
{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 2,
        subject: "What instrument speaks to you?",
        body: `Hi {{firstName}},

Just checking in from Lakehouse! I wanted to share a bit more about our programs so you can find your perfect fit.

🎸 GUITAR — From pop and rock to fingerstyle and jazz. Ages 7+
🥁 DRUMS — Full kit instruction, rhythm training, groove mastery. Ages 8+
🎸 BASS — Groove-focused lessons for the backbone of every band. Ages 10+
🎤 VOCALS — Technique, breath control, performance coaching. All ages
🎹 KEYS — Classical foundations or contemporary styles. Ages 5+
🎻 VIOLIN — Classical to fiddle, Suzuki-friendly. Ages 5+
🪗 UKULELE — Fun, fast, and beginner-friendly. Perfect for all ages

Every instructor at Lakehouse is carefully vetted — real musicians who know how to teach. We match you with the right fit, not just whoever's available.

What instrument are you drawn to? Hit reply and let's chat!

Best,
{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 5,
        subject: "See what our students are doing",
        body: `Hi {{firstName}},

We know picking a music school is a big decision, so we want to show you (not just tell you) what Lakehouse is all about.

Here's what some of our families are saying:

⭐ "My son started guitar with zero experience and performed at the Big Gig in just 6 months. I cried happy tears." — Maria R., guitar parent

⭐ "I'm 42 and always wanted to play piano. Lakehouse made it feel possible. My instructor is incredible." — Ben C., adult student

⭐ "The teachers genuinely care. They know my daughter's name, her goals, her favorite songs. It's a community." — the Patel family

And the Big Gig? It's our signature student showcase — a real concert experience that gives students something to work toward and a moment they'll never forget.

We'd love for your family to experience this. Book your free trial lesson and see for yourself.

{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 7,
        subject: "Your spot is waiting — last chance to book",
        body: `Hi {{firstName}},

I don't want to be a bother, but I also don't want you to miss out.

We have a limited number of trial lesson slots available, and they tend to fill up fast — especially on evenings and weekends.

If Lakehouse feels like the right fit, the easiest next step is a free, no-pressure trial lesson. You'll get to:
✅ Meet your instructor one-on-one
✅ Experience our teaching style firsthand
✅ Ask all the questions you have
✅ Leave with a personalized path forward

No commitment required. If you love it, great — we'd love to have you. If it's not the right fit, no hard feelings.

Ready to claim your spot? Just reply with a few times that work for you and we'll get it scheduled.

Hope to see you soon!
{{assignedTo}}
Lakehouse Music Academy`,
      },
    ],
  },
  {
    id: "seq-2",
    phase: "admit",
    name: "Just Enrolled — Welcome to the Family",
    steps: [
      {
        day: 0,
        subject: "Welcome to the Lakehouse Family! 🎉",
        body: `Hi {{firstName}},

This is the email I love sending most — WELCOME TO LAKEHOUSE!

You've made a wonderful decision, and we are so excited to have you with us. Here's what's coming up next:

📋 WHAT TO EXPECT THIS WEEK:
1. Your instructor will reach out to introduce themselves
2. We'll send your student orientation guide
3. You'll receive Canvas LMS login credentials (our student portal)
4. Your first lesson is right around the corner!

🎸 A NOTE BEFORE YOUR FIRST LESSON:
Don't worry about being "ready." You don't need to know anything. You don't need to practice anything. Just show up with curiosity and enthusiasm — your instructor will take care of the rest.

We're honored to be part of your musical journey. This is just the beginning.

With excitement,
{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 1,
        subject: "Meet your instructor",
        body: `Hi {{firstName}},

We wanted to formally introduce you to your Lakehouse instructor!

Your instructor, {{assignedTo}}, is one of our most dedicated teachers. They bring years of performance and teaching experience and a genuine love for helping students find their voice — literally and figuratively.

Their teaching philosophy:
🎯 Every student learns differently — lessons are always personalized
🎵 Music should be fun, not a chore
💪 Progress happens when you're challenged but never overwhelmed
🎤 Playing real music you love is the fastest path to growth

Before your first lesson, {{assignedTo}} may send you a short note asking about your goals, favorite artists, or musical experience. Take a moment to reply — it helps them prepare an amazing first session just for you.

We're so glad you're here!

{{assignedTo}} & the Lakehouse team`,
      },
    ],
  },
  {
    id: "seq-3",
    phase: "affirm",
    name: "First Week — Getting Settled",
    steps: [
      {
        day: 1,
        subject: "Your first lesson preview — here's what to expect",
        body: `Hi {{firstName}},

Your first official Lakehouse lesson is almost here! We want to make sure you feel completely prepared and excited.

📍 BEFORE YOU ARRIVE:
- Plan to arrive 5 minutes early
- Bring your instrument if you have one (we have loaners if not)
- Pack a small notebook or use your phone for notes
- Wear comfortable clothes — especially if you're playing drums!

🎵 WHAT YOUR FIRST LESSON WILL COVER:
Your instructor will start with a get-to-know-you conversation about your goals, musical tastes, and any prior experience. From there, you'll jump right into making music — no boring theory lectures on day one.

📸 PHOTOS:
We love capturing milestone moments with student permission. Let your instructor know if you're comfortable with a first-lesson photo!

🏠 THE STUDIO:
Free parking behind the building. Buzzer at the front door — we'll be expecting you.

Any questions before you come in? Just hit reply!

{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 3,
        subject: "Getting to know Canvas — your student portal",
        body: `Hi {{firstName}},

We use Canvas as our student learning management system — think of it as your Lakehouse home base.

Here's what you'll find in Canvas:
📚 LESSON NOTES — Your instructor posts notes, tabs, and resources after every lesson
🎥 PRACTICE VIDEOS — Short clips to help you practice correctly at home
📅 SCHEDULE — Your upcoming lesson dates and any studio news
💬 MESSAGES — Direct line to your instructor between lessons
🏆 MILESTONES — Track your progress and celebrate achievements

Your login credentials were emailed to you separately. If you haven't received them yet, check your spam folder or reply to this email and we'll resend.

Pro tip: Download the Canvas Student app on your phone for quick access to lesson notes and practice materials on the go!

Let us know if you need any help getting set up.

{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 5,
        subject: "Practice tips for {{instrument}}",
        body: `Hi {{firstName}},

Your instructor wanted to share some personalized practice guidance to help you get the most out of your time between lessons!

🎵 TIPS FOR PRACTICING {{instrument}}:

✅ Short and consistent beats long and infrequent — 15 minutes every day is better than 2 hours on Sunday
✅ Always warm up before diving into new material
✅ Practice slowly first — speed comes from accuracy, not the other way around
✅ Record yourself once a week and listen back — you'll be amazed at your progress
✅ End every session with something you can already play well — leave on a high note!

📱 RECOMMENDED APPS:
- GuitarTuna / PianoTuner — for tuning
- Metronome Beats — for rhythm practice
- YouTube — your instructor's favorite reference resource

Remember: there's no such thing as a "bad" practice session. Even 10 minutes counts.

See you at your next lesson!
{{assignedTo}}`,
      },
    ],
  },
  {
    id: "seq-4",
    phase: "activate",
    name: "First Lessons — Feedback & Check-In",
    steps: [
      {
        day: 8,
        subject: "How was your first lesson? We'd love to know!",
        body: `Hi {{firstName}},

You've officially completed your first Lakehouse lesson — congratulations!

We care deeply about your experience and want to make sure everything is exactly right. Could you take 2 minutes to share your thoughts?

A few questions:
1. How did you feel about the pace and style of your lesson?
2. Is there anything you'd like more or less of?
3. Did anything surprise you (good or bad)?
4. On a scale of 1-10, how excited are you for your next lesson?

Your feedback helps us make every lesson better. There are no wrong answers — we want the honest truth!

You can reply directly to this email or chat with {{assignedTo}} at your next session.

Thank you for trusting us with your musical journey. We're rooting for you!

{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 12,
        subject: "Quick check-in — how's everything going?",
        body: `Hi {{firstName}},

Just a quick note from the Lakehouse team to see how things are going after your first few lessons!

Parents and adult students alike tell us that weeks 2-4 are when the initial excitement either deepens into real commitment OR when doubt starts to creep in. Both are completely normal.

If you're loving it — amazing! We'd love to hear what's clicking.

If you're feeling frustrated — that's actually a great sign. It means you're being challenged. Stick with it! The breakthrough moments are just around the corner.

And if anything isn't working — the schedule, the instructor fit, the lesson style — please tell us. We can adjust. Your success is our success.

How are you doing? We're here for you.

{{assignedTo}}
Lakehouse Music Academy

P.S. Don't forget — your instructor posts practice notes in Canvas after every lesson. Check in there between sessions!`,
      },
    ],
  },
  {
    id: "seq-5",
    phase: "acclimate",
    name: "Onboarding — Semester Roadmap",
    steps: [
      {
        day: 15,
        subject: "Your semester roadmap at Lakehouse",
        body: `Hi {{firstName}},

You're two weeks in and things are really taking shape — this is such an exciting time in your musical development!

Here's a look at what your Lakehouse semester has in store:

📅 KEY DATES TO KNOW:
- Monthly Jam Sessions — casual student get-togethers (ask your instructor for next date)
- Mid-Semester Check-In — a quick 15-minute review with your instructor around week 8
- The Big Gig — our flagship student showcase (details below!)
- Re-enrollment opens 30 days before semester end

🎪 THE BIG GIG:
The Big Gig is Lakehouse's signature student performance event — a real concert experience at a real venue. It's optional but incredibly rewarding. Students who participate consistently say it's one of the highlights of their musical life.

Your instructor will let you know when they think you're ready to participate. Start thinking about what song you'd love to perform!

🎯 GOALS CHECK:
What do you want to accomplish this semester? Reply and let us know — we'll share it with your instructor so they can build a roadmap just for you.

{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 30,
        subject: "One month in — you're doing amazing!",
        body: `Hi {{firstName}},

One full month at Lakehouse — let's celebrate that for a second!

When you walked through our doors (or filled out that inquiry form), you took a step that most people only dream about. You actually did it. And you're still here, still showing up, still putting in the work.

Your instructor has noticed your growth and wanted us to pass along some encouragement: the habits you're building now — the consistency, the patience, the willingness to be a beginner — will pay off in ways you can't yet imagine.

A few things to celebrate this month:
✅ You've established a practice routine
✅ You're learning the language of music
✅ You've already played things you couldn't a month ago

Next step: let's make sure your second month is even better. Talk to your instructor at your next lesson about what you want to focus on for the rest of the semester.

Keep going — we're so proud of you!

{{assignedTo}}
Lakehouse Music Academy`,
      },
    ],
  },
  {
    id: "seq-6",
    phase: "accomplish",
    name: "Milestone Celebration & Big Gig Prep",
    steps: [
      {
        day: 0,
        subject: "Congratulations on your first complete song! 🎉",
        body: `Hi {{firstName}},

We just heard the news from your instructor and we had to reach out immediately:

YOU PLAYED YOUR FIRST COMPLETE SONG. 🎸🎹🥁

This is a bigger deal than you might realize. Most people who pick up an instrument never reach this moment. You did.

Your instructor reports that you've shown incredible dedication, a great ear, and the kind of persistence that separates students who truly grow from those who give up. You should be genuinely proud.

This milestone unlocks something important: you now know that you CAN do this. Every song after this first one will come faster and feel better.

We'd love to celebrate with you at the studio. If you haven't already, ask your instructor about:
🎪 Performing at the next Big Gig
🎵 Recording a short clip in our studio
🏆 Your next milestone song goal

What do you want to learn next? The sky's the limit!

{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 14,
        subject: "The Big Gig is coming — and you're ready!",
        body: `Hi {{firstName}},

The Big Gig is Lakehouse's most anticipated event of the year — and we think you're ready to be part of it!

🎪 WHAT IS THE BIG GIG?
It's a real concert at a real venue. Students perform for family, friends, and fellow Lakehouse musicians. It's not a recital — it's a show. There are lights, a stage, a sound system, and an audience that's there to cheer you on.

🎸 WHY YOU SHOULD PERFORM:
- It gives you a concrete goal to work toward
- The feeling of playing in front of an audience is unforgettable
- Every Lakehouse student who has performed says it changed their relationship with music
- You've earned it — your instructor believes you're ready

📋 LOGISTICS:
- Date: TBD — watch your Canvas portal for details
- Duration: Each student plays 1-3 songs (2-5 minutes on stage)
- Rehearsal: One group sound check the week before
- Guests: You can invite as many people as you want!

Reply to confirm your interest and your instructor will start building your set list with you.

The stage is yours.
{{assignedTo}}
Lakehouse Music Academy`,
      },
    ],
  },
  {
    id: "seq-7",
    phase: "adopt",
    name: "Loyalty — Re-Enrollment & Advanced Programs",
    steps: [
      {
        day: 75,
        subject: "Early bird re-enrollment — priority access for you",
        body: `Hi {{firstName}},

As one of our most dedicated Lakehouse students, you get first access to next semester's schedule before it opens to the public.

Early bird re-enrollment is open NOW — and here's why it matters:

⏰ WHY ENROLL EARLY:
- Lock in your current instructor and time slot before the general opening
- Popular evening and weekend slots fill within 48 hours once they go public
- Early enrollees get priority placement in any new group programs or workshops

💰 EARLY BIRD BONUS:
Re-enroll by [early deadline] and receive:
- Your current tuition rate locked in for the full semester
- One complimentary make-up lesson credit
- Access to new ensemble programs before general registration

Your journey at Lakehouse has been incredible. We'd love nothing more than to keep growing with you.

Reply to this email or log into Canvas to complete your re-enrollment. It only takes 2 minutes.

See you next semester!
{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 85,
        subject: "Ready for the next level? Here's what's waiting for you",
        body: `Hi {{firstName}},

You've come an extraordinary distance since you first walked into Lakehouse. Your instructor has been talking about you — in the best possible way.

We think you're ready for something more.

🚀 ADVANCED OPPORTUNITIES FOR YOU:

🎸 Advanced 1-on-1 Instruction — deeper dives into theory, technique, and artistry with specialist instructors

🎤 Ensemble & Band Programs — play with other advanced students in a full band setting (electric, acoustic, or vocal-focused)

🎼 Songwriting Workshop — learn to write original music and develop your unique voice

🎪 Big Gig Leadership — be a featured performer or even a student mentor at our next showcase

🏆 Performance Track — structured program for students interested in auditions, competitions, or music school applications

These programs are invitation-only, and you've earned an invitation.

Want to explore any of these? Reply and let's set up a 15-minute call with your instructor to map out your next chapter.

The next level is waiting for you.
{{assignedTo}}
Lakehouse Music Academy`,
      },
    ],
  },
  {
    id: "seq-8",
    phase: "advocate",
    name: "Advocate — Referrals & Reviews",
    steps: [
      {
        day: 0,
        subject: "Share the Lakehouse experience — and we'll say thank you",
        body: `Hi {{firstName}},

The Big Gig is done, the applause has faded, and we're still buzzing from what an amazing night it was.

You were a huge part of making it special — and we want to give back.

🎁 THE LAKEHOUSE REFERRAL PROGRAM:

For every friend or family member you refer who enrolls at Lakehouse, you receive:
- $50 lesson credit applied to your next billing cycle
- No limit — refer 5 students, get $250 in credits
- Special recognition at our next Big Gig

🎤 HOW TO REFER:
Just send us a name and email, or have your friend mention your name when they inquire. We'll handle the rest.

We grew this community through word of mouth — one student telling another student how much they love Lakehouse. That's the most powerful thing we have.

If Lakehouse has meant something to you, sharing it with someone else is the greatest gift you can give them.

And a huge, heartfelt thank you for being one of our favorite people.
{{assignedTo}}
Lakehouse Music Academy`,
      },
      {
        day: 30,
        subject: "Would you leave us a quick review?",
        body: `Hi {{firstName}},

We have a small favor to ask — and we promise it'll only take 2 minutes.

Would you be willing to leave us a review on Google or Yelp?

Here's why it matters: when families are searching for music lessons for their kids (or themselves), honest reviews from real students are the #1 thing that helps them decide. Your words could be the reason someone discovers the thing they love.

⭐ LEAVE A GOOGLE REVIEW:
Search "Lakehouse Music Academy" on Google and click "Write a Review"

⭐ LEAVE A YELP REVIEW:
Search us on Yelp or ask us for a direct link

Not sure what to say? Just write what's true for you — how you started, what changed, how you feel about it now. Authentic beats polished every time.

If you'd rather share your story with us directly for our website or social media, we'd love that too. Just reply to this email.

Thank you for being part of the Lakehouse community. You make this place what it is.

With so much appreciation,
{{assignedTo}}
Lakehouse Music Academy`,
      },
    ],
  },
];

// Sequences
export async function getSequences(): Promise<Sequence[]> {
  return getOrSeed<Sequence>(KEYS.sequences, SEED_SEQUENCES);
}

export async function createSequence(data: Omit<Sequence, "id">): Promise<Sequence> {
  const sequences = await getSequences();
  const newSequence: Sequence = { ...data, id: `seq-${uuidv4()}` };
  sequences.push(newSequence);
  await setArray(KEYS.sequences, sequences);
  return newSequence;
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
