"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Layers,
  ClipboardList,
  FileText,
  Activity,
  FileBarChart,
} from "lucide-react";
import { motion } from "framer-motion";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/design/motion";

const NAV_GROUPS = [
  {
    label: "Visão Geral",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/produtividade", label: "Produtividade", icon: Activity },
      { href: "/dashboard/sobrecarga", label: "Sobrecarga", icon: FileBarChart },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/servidores", label: "Servidores", icon: Users },
      { href: "/nucleos", label: "Núcleos", icon: Layers },
      { href: "/atividades", label: "Atividades", icon: ClipboardList },
      { href: "/processos", label: "Processos", icon: FileText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r",
        "bg-[var(--surface)]/70 backdrop-blur-xl lg:flex",
      )}
    >
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={20} />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "text-[var(--text)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text)]",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          transition={spring.snappy}
                          className="absolute inset-0 rounded-lg bg-[var(--elevated)] shadow-[var(--shadow-sm)]"
                        />
                      )}
                      <Icon
                        className="relative h-4 w-4"
                        strokeWidth={1.75}
                      />
                      <span className="relative">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t px-5 py-4 text-[11px] text-[var(--text-subtle)]">
        CGEO+ · v0.1
      </div>
    </aside>
  );
}
