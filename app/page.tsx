"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("lh-auth") === "true") {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 400));

    if (password === "lakehouse2026") {
      localStorage.setItem("lh-auth", "true");
      router.push("/dashboard");
    } else {
      setError("Incorrect password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Header band */}
          <div className="px-8 py-10 text-center border-b border-white/10">
            <h1
              className="text-white text-4xl tracking-wider uppercase"
              style={{ fontFamily: "var(--font-anton), Impact, sans-serif" }}
            >
              LAKEHOUSE
            </h1>
            <h2
              className="text-white text-2xl tracking-widest uppercase"
              style={{ fontFamily: "var(--font-anton), Impact, sans-serif" }}
            >
              CRM
            </h2>
            <p className="text-gray-500 text-xs mt-3 uppercase tracking-widest">
              Music Academy · Staff Portal
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            <h2 className="text-lg font-bold text-white mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-5">Enter your staff password to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  <Lock className="w-3.5 h-3.5 inline mr-1" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className={`w-full bg-black border rounded-lg px-3 py-2.5 text-sm pr-10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/40 focus:border-[#DC143C] transition-colors ${
                      error ? "border-[#DC143C]/60 bg-[#DC143C]/5" : "border-white/15"
                    }`}
                    placeholder="Enter password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-[#DC143C] mt-1.5 font-medium">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-white text-black rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4 uppercase tracking-widest">
          Lakehouse Music Academy · Staff Only
        </p>
      </div>
    </div>
  );
}
