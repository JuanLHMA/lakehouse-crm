"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  AlertCircle,
  TrendingUp,
  UserPlus,
  ArrowRight,
  Kanban,
} from "lucide-react";
import ProtectedLayout from "@/components/ProtectedLayout";
import PhaseTag from "@/components/PhaseTag";
import ContactForm from "@/components/ContactForm";
import {
  formatRelativeDate,
  getActivityIcon,
  getActivityLabel,
  isOverdue,
} from "@/lib/utils";
import type { Lead, Activity, AnalyticsData } from "@/lib/types";
import { PHASES } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [analyticsRes, activitiesRes, leadsRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/activities"),
        fetch("/api/leads"),
      ]);
      const [analyticsData, activitiesData, leadsData] = await Promise.all([
        analyticsRes.json() as Promise<AnalyticsData>,
        activitiesRes.json() as Promise<Activity[]>,
        leadsRes.json() as Promise<Lead[]>,
      ]);
      setAnalytics(analyticsData);
      setActivities(activitiesData.slice(0, 10));
      setLeads(leadsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const overdueLeads = leads.filter(isOverdue);

  const getLeadName = (leadId: string) => {
    return leads.find((l) => l.id === leadId)?.name ?? "Unknown";
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

  return (
    <ProtectedLayout>
      {showAddForm && (
        <ContactForm
          onClose={() => setShowAddForm(false)}
          onSave={() => {
            setShowAddForm(false);
            void loadData();
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back — here&apos;s what&apos;s happening at Lakehouse
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors uppercase tracking-wide"
          >
            <UserPlus className="w-4 h-4" />
            Add Lead
          </button>
          <Link
            href="/pipeline"
            className="flex items-center gap-2 border border-white/15 bg-transparent text-gray-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            <Kanban className="w-4 h-4" />
            Pipeline
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4 hover:border-white/20 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Leads</span>
          </div>
          <p className="text-3xl font-bold text-white">{analytics?.totalLeads ?? 0}</p>
          <p className="text-xs text-gray-600 mt-1">
            {analytics?.activeLeads ?? 0} active · {analytics?.convertedLeads ?? 0} converted
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 hover:border-white/20 transition-all cursor-pointer ${
            (analytics?.overdueLeads ?? 0) > 0
              ? "border-[#DC143C]/30 bg-[#DC143C]/5"
              : "border-white/10 bg-[#1A1A1A]"
          }`}
          onClick={() => router.push("/pipeline")}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                (analytics?.overdueLeads ?? 0) > 0 ? "bg-[#DC143C]/10" : "bg-white/5"
              }`}
            >
              <AlertCircle
                className={`w-5 h-5 ${
                  (analytics?.overdueLeads ?? 0) > 0 ? "text-[#DC143C]" : "text-gray-600"
                }`}
              />
            </div>
            <span className="text-sm font-medium text-gray-500">Overdue</span>
          </div>
          <p
            className={`text-3xl font-bold ${
              (analytics?.overdueLeads ?? 0) > 0 ? "text-[#DC143C]" : "text-white"
            }`}
          >
            {analytics?.overdueLeads ?? 0}
          </p>
          <p className="text-xs text-gray-600 mt-1">Follow-ups past due date</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4 hover:border-white/20 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-gray-500">Conversion Rate</span>
          </div>
          <p className="text-3xl font-bold text-white">{analytics?.conversionRate ?? 0}%</p>
          <p className="text-xs text-gray-600 mt-1">Leads to converted students</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4 hover:border-white/20 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-sm font-medium text-gray-500">This Week</span>
          </div>
          <p className="text-3xl font-bold text-white">{analytics?.newLeadsThisWeek ?? 0}</p>
          <p className="text-xs text-gray-600 mt-1">New leads this week</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Phase Breakdown */}
        <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">Pipeline Overview</h2>
            <Link
              href="/pipeline"
              className="text-xs text-[#DC143C] font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {PHASES.map((phase) => {
              const count = analytics?.leadsByPhase[phase] ?? 0;
              const max = Math.max(...Object.values(analytics?.leadsByPhase ?? {}), 1);
              return (
                <div key={phase} className="flex items-center gap-3">
                  <PhaseTag phase={phase} size="sm" />
                  <div className="flex-1 bg-white/10 rounded-full h-1.5">
                    <div
                      className="bg-[#DC143C] h-1.5 rounded-full transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue leads */}
        <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">
              Needs Attention
              {overdueLeads.length > 0 && (
                <span className="ml-2 bg-[#DC143C]/20 text-[#DC143C] text-xs font-bold px-2 py-0.5 rounded-full">
                  {overdueLeads.length}
                </span>
              )}
            </h2>
          </div>
          {overdueLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-600">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueLeads.slice(0, 5).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/contacts/${lead.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#DC143C]/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-[#DC143C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-gray-300 truncate">
                      {lead.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{lead.phase}</p>
                  </div>
                  <PhaseTag phase={lead.phase} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[#1A1A1A] rounded-xl border border-white/10 p-4">
          <h2 className="font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activities.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <span className="text-base flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/contacts/${activity.leadId}`}
                      className="text-xs font-semibold text-white hover:text-gray-300 transition-colors"
                    >
                      {getLeadName(activity.leadId)}
                    </Link>
                    <span className="text-xs text-gray-600">
                      · {getActivityLabel(activity.type)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate mt-0.5">{activity.content}</p>
                  <p className="text-xs text-gray-700 mt-0.5">
                    {formatRelativeDate(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
