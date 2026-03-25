"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Mail, Clock } from "lucide-react";
import ProtectedLayout from "@/components/ProtectedLayout";
import PhaseTag from "@/components/PhaseTag";
import type { Sequence } from "@/lib/types";

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sequences")
      .then((r) => r.json() as Promise<Sequence[]>)
      .then((data) => {
        setSequences(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Sequences</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Automated email nurture sequences for each phase of the student journey
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const isOpen = expanded === seq.id;
            return (
              <div
                key={seq.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Header */}
                <button
                  onClick={() => toggle(seq.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#DC143C]/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#DC143C]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="font-bold text-gray-900">{seq.name}</h2>
                      <PhaseTag phase={seq.phase} size="sm" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {seq.steps.length} email{seq.steps.length !== 1 ? "s" : ""} ·{" "}
                      {seq.steps[seq.steps.length - 1].day} days total
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isOpen ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Steps */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {seq.steps.map((step, index) => (
                      <div key={index} className="flex gap-4">
                        {/* Day badge + line */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-12 h-7 rounded-full bg-[#DC143C]/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-[#DC143C]">
                              Day {step.day}
                            </span>
                          </div>
                          {index < seq.steps.length - 1 && (
                            <div className="w-px flex-1 min-h-[32px] bg-gray-200 mt-1" />
                          )}
                        </div>

                        {/* Email content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Subject
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm mb-2">
                            {step.subject}
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                              {step.body}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>Sends on day {step.day} of sequence</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm">About Email Sequences</h3>
            <p className="text-blue-700 text-sm mt-1">
              Each sequence is triggered when a lead enters a new phase. Emails are automatically
              personalized with the lead&apos;s name and assigned staff member. Sequences can be
              paused or customized per lead from the contact detail view.
            </p>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
