import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { Lead, Activity, Sequence, AnalyticsData, Phase } from "./types";
import { PHASES } from "./types";
import { isOverdue } from "./utils";

const dataDir = path.join(process.cwd(), "data");

async function readJson<T>(filename: string): Promise<T> {
  const filePath = path.join(dataDir, filename);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(dataDir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// Leads
export async function getLeads(): Promise<Lead[]> {
  return readJson<Lead[]>("leads.json");
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
  await writeJson("leads.json", leads);
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
  await writeJson("leads.json", leads);
  return updated;
}

export async function deleteLead(id: string): Promise<boolean> {
  const leads = await getLeads();
  const filtered = leads.filter((l) => l.id !== id);
  if (filtered.length === leads.length) return false;
  await writeJson("leads.json", filtered);
  return true;
}

// Activities
export async function getActivities(leadId?: string): Promise<Activity[]> {
  const activities = await readJson<Activity[]>("activities.json");
  if (leadId) {
    return activities.filter((a) => a.leadId === leadId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return activities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createActivity(
  data: Omit<Activity, "id" | "createdAt">
): Promise<Activity> {
  const activities = await readJson<Activity[]>("activities.json");
  const newActivity: Activity = {
    ...data,
    id: `act-${uuidv4()}`,
    createdAt: new Date().toISOString(),
  };
  activities.push(newActivity);
  await writeJson("activities.json", activities);
  return newActivity;
}

// Sequences
export async function getSequences(): Promise<Sequence[]> {
  return readJson<Sequence[]>("sequences.json");
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

  // Avg days in phase based on updatedAt
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
