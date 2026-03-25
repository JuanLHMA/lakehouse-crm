"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { TrendingUp, Users, Star, Clock } from "lucide-react";
import ProtectedLayout from "@/components/ProtectedLayout";
import type { AnalyticsData, Phase } from "@/lib/types";
import { PHASES } from "@/lib/types";
import { formatPhase } from "@/lib/utils";

const PHASE_COLORS: Record<Phase, string> = {
  assess: "#64748b",
  admit: "#3b82f6",
  affirm: "#8b5cf6",
  activate: "#f59e0b",
  acclimate: "#f97316",
  accomplish: "#10b981",
  adopt: "#14b8a6",
  advocate: "#f43f5e",
};

const SOURCE_COLORS = ["#DC143C", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json() as Promise<AnalyticsData>)
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
        </div>
      </ProtectedLayout>
    );
  }

  if (!analytics) return null;

  const phaseBarData = PHASES.map((phase) => ({
    name: formatPhase(phase),
    count: analytics.leadsByPhase[phase] ?? 0,
    phase,
  }));

  const avgDaysData = PHASES.map((phase) => ({
    name: formatPhase(phase),
    days: analytics.avgDaysInPhase[phase] ?? 0,
    phase,
  }));

  const sourceData = Object.entries(analytics.leadsBySource).map(([source, count]) => ({
    name: source === "walk-in" ? "Walk-In" : source === "opus1" ? "Opus1" : source.charAt(0).toUpperCase() + source.slice(1),
    value: count,
  }));

  const assigneeData = Object.entries(analytics.leadsByAssignee)
    .map(([name, count]) => ({ name: name.split(" ")[0], count }))
    .sort((a, b) => b.count - a.count);

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Key metrics for the Lakehouse student journey
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Total Leads</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics.totalLeads}</p>
          <p className="text-xs text-gray-400 mt-1">
            {analytics.activeLeads} active
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Conversion Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics.conversionRate}%</p>
          <p className="text-xs text-gray-400 mt-1">
            {analytics.convertedLeads} converted
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Star className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">Overdue</span>
          </div>
          <p className={`text-2xl font-bold ${analytics.overdueLeads > 0 ? "text-red-600" : "text-gray-900"}`}>
            {analytics.overdueLeads}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Follow-ups overdue
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">This Week</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics.newLeadsThisWeek}</p>
          <p className="text-xs text-gray-400 mt-1">New leads</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Leads by Phase */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Leads by Phase</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={phaseBarData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {phaseBarData.map((entry) => (
                  <Cell
                    key={entry.phase}
                    fill={PHASE_COLORS[entry.phase as Phase] ?? "#DC143C"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Days in Phase */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Avg Days in Phase</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={avgDaysData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 60, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value) => [`${value ?? 0} days`, "Avg time"]}
              />
              <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                {avgDaysData.map((entry) => (
                  <Cell
                    key={entry.phase}
                    fill={PHASE_COLORS[entry.phase as Phase] ?? "#DC143C"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Leads by Source */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Leads by Source</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                label={false}
                labelLine={false}
              >
                {sourceData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Assignees */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Leads by Assignee</h2>
          <div className="space-y-3">
            {assigneeData.map(({ name, count }, index) => {
              const max = Math.max(...assigneeData.map((a) => a.count), 1);
              const fullName = Object.keys(analytics.leadsByAssignee).find(
                (a) => a.split(" ")[0] === name
              ) ?? name;
              return (
                <div key={name} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
                  >
                    {name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{fullName}</span>
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${(count / max) * 100}%`,
                          backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
