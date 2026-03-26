"use client";

import { useRouter } from "next/navigation";
import { Clock, AlertCircle, Calendar } from "lucide-react";
import { cn, getDaysInPhase, getUrgencyLevel, isOverdue, formatInstrument, formatRelativeDate } from "@/lib/utils";
import type { Lead } from "@/lib/types";

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
}

const urgencyBorder: Record<string, string> = {
  red: "border-l-red-500",
  yellow: "border-l-amber-400",
  green: "border-l-emerald-500",
};

const urgencyDot: Record<string, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
};

const instrumentEmoji: Record<string, string> = {
  guitar: "🎸",
  drums: "🥁",
  bass: "🎸",
  vocals: "🎤",
  keys: "🎹",
  violin: "🎻",
  ukulele: "🪗",
};

export default function LeadCard({ lead, isDragging }: LeadCardProps) {
  const router = useRouter();
  const urgency = getUrgencyLevel(lead);
  const daysInPhase = getDaysInPhase(lead);
  const overdue = isOverdue(lead);

  return (
    <div
      onClick={() => router.push(`/contacts/${lead.id}`)}
      className={cn(
        "bg-[#1A1A1A] rounded-lg border border-l-4 border-white/10 p-3 cursor-pointer transition-all hover:shadow-xl hover:border-white/20 group select-none",
        urgencyBorder[urgency],
        isDragging && "shadow-2xl opacity-90 rotate-1 scale-105"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm text-white group-hover:text-gray-300 transition-colors leading-tight">
          {lead.name}
        </h3>
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", urgencyDot[urgency])} />
      </div>

      {/* Instrument */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-sm">{instrumentEmoji[lead.instrument] ?? "🎵"}</span>
        <span className="text-xs text-gray-400 font-medium">{formatInstrument(lead.instrument)}</span>
        <span className="text-gray-700">·</span>
        <span className="text-xs text-gray-600">Age {lead.age}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Clock className="w-3 h-3" />
          <span>{daysInPhase}d in phase</span>
        </div>

        {overdue ? (
          <div className="flex items-center gap-1 text-xs text-red-500 font-medium">
            <AlertCircle className="w-3 h-3" />
            <span>Overdue</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{formatRelativeDate(lead.nextActionDate)}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/10">
          {lead.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-white/10 text-gray-400 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="text-xs text-gray-600">+{lead.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Assigned */}
      <div className="mt-2 pt-1">
        <span className="text-xs text-gray-600">{lead.assignedTo.split(" ")[0]}</span>
      </div>
    </div>
  );
}
