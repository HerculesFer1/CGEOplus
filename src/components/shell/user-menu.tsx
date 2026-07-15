"use client";

import { LogOut, User } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { spring } from "@/lib/design/motion";
import { signOutAction } from "@/lib/auth/actions";
import type { Profile } from "@/lib/db/schema";

export function UserMenu({ user }: { user: Profile | null }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  const primeiroNome = user.nome.split(" ")[0] ?? user.email;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-full border bg-[var(--surface)] pl-1 pr-3 text-sm text-[var(--text)] transition-colors hover:bg-[var(--elevated)]"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white">
          <User className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <span className="hidden sm:inline">{primeiroNome}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={spring.snappy}
            className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border bg-[var(--elevated)] shadow-[var(--shadow-xl)]"
          >
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">{user.nome}</p>
              <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
                Papel: {user.role}
              </p>
            </div>
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await signOutAction();
                  });
                }}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Sair
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
