"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Layers,
  ClipboardList,
  FileText,
  Activity,
  FileBarChart,
  ChevronDown,
  TreePine,
  Folders,
  Target,
  CalendarClock,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/design/motion";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: Array<{ href: string; label: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
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
      { href: "/metas", label: "Metas", icon: Target },
      { href: "/eventos", label: "Eventos", icon: CalendarClock },
    ],
  },
  {
    label: "Monitoramento",
    items: [
      {
        href: "/monitoramento",
        label: "Projetos",
        icon: Folders,
        children: [
          { href: "/monitoramento?programa=Pilares%20II", label: "Pilares II" },
          { href: "/monitoramento?programa=PSI", label: "PSI" },
        ],
      },
      { href: "/car", label: "SICAR / CAR", icon: TreePine },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  // Search string vem do window só depois do mount — evita hydration mismatch
  // no highlight do sub-item ativo (?programa=X aparece só no client).
  const [search, setSearch] = useState("");
  useEffect(() => {
    const sync = () => setSearch(window.location.search);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

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
              {group.items.map((item) => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  search={search}
                />
              ))}
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

function NavItemRow({
  item,
  pathname,
  search,
}: {
  item: NavItem;
  pathname: string | null;
  search: string;
}) {
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname?.startsWith(item.href));
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;

  // Item com children não navega ao clicar — toggla o submenu (item.href
  // segue disponível pelos links-filho e pela visão geral do próprio item).
  // Auto-abre quando a rota do pai já está ativa, pra não esconder navegação
  // ao entrar via URL direta.
  const [open, setOpen] = useState(active);
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const commonClass = cn(
    "relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
    active
      ? "text-[var(--text)]"
      : "text-[var(--text-muted)] hover:text-[var(--text)]",
  );

  return (
    <li>
      {hasChildren ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={commonClass}
        >
          {active && (
            <motion.span
              layoutId="sidebar-active"
              transition={spring.snappy}
              className="absolute inset-0 rounded-lg bg-[var(--elevated)] shadow-[var(--shadow-sm)]"
            />
          )}
          <Icon className="relative h-4 w-4" strokeWidth={1.75} />
          <span className="relative flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              "relative h-3.5 w-3.5 transition-transform",
              open ? "rotate-0" : "-rotate-90",
            )}
            strokeWidth={2}
          />
        </button>
      ) : (
        <Link href={item.href} className={commonClass}>
          {active && (
            <motion.span
              layoutId="sidebar-active"
              transition={spring.snappy}
              className="absolute inset-0 rounded-lg bg-[var(--elevated)] shadow-[var(--shadow-sm)]"
            />
          )}
          <Icon className="relative h-4 w-4" strokeWidth={1.75} />
          <span className="relative">{item.label}</span>
        </Link>
      )}
      <AnimatePresence initial={false}>
        {hasChildren && open && (
          <motion.ul
            key="submenu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.snappy}
            className="ml-6 mt-0.5 space-y-0.5 overflow-hidden border-l border-[var(--border)] pl-3"
          >
            {/* Visão geral do próprio item — ainda navega pra /monitoramento */}
            <SubItem
              href={item.href}
              label="Visão geral"
              active={pathname === item.href && !search.includes("programa=")}
            />
            {item.children!.map((c) => {
              const [, cQuery = ""] = c.href.split("?");
              const cParams = new URLSearchParams(cQuery);
              const currentParams = new URLSearchParams(search);
              const isChildActive =
                pathname === item.href &&
                [...cParams.entries()].every(
                  ([k, v]) => currentParams.get(k) === v,
                );
              return (
                <SubItem
                  key={c.href}
                  href={c.href}
                  label={c.label}
                  active={isChildActive}
                />
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

function SubItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "block rounded-md px-3 py-1.5 text-[13px] transition-colors",
          active
            ? "bg-[var(--surface)] text-[var(--text)]"
            : "text-[var(--text-muted)] hover:text-[var(--text)]",
        )}
      >
        {label}
      </Link>
    </li>
  );
}
