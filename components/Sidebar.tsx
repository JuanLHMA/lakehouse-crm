"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  Mail,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/sequences", label: "Sequences", icon: Mail },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("lh-auth");
    router.push("/");
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div>
          <p
            className="text-white text-xl tracking-widest uppercase leading-none"
            style={{ fontFamily: "var(--font-anton), Impact, sans-serif" }}
          >
            LAKE
          </p>
          <p
            className="text-white text-xl tracking-widest uppercase leading-none"
            style={{ fontFamily: "var(--font-anton), Impact, sans-serif" }}
          >
            HOUSE
          </p>
          <p className="text-[#DC143C] text-xs tracking-widest uppercase mt-1 font-bold">
            CRM
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-white text-black"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-white/10 hover:text-white transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-black border-r border-white/10 min-h-screen fixed left-0 top-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-black border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <span
          className="text-white font-bold text-lg tracking-widest uppercase"
          style={{ fontFamily: "var(--font-anton), Impact, sans-serif" }}
        >
          LAKEHOUSE CRM
        </span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-black border-r border-white/10 flex flex-col">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
