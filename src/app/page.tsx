"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Users, FileText, Sparkles } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  fadeSlideUp,
  staggerContainer,
  spring,
} from "@/lib/design/motion";

const features = [
  {
    icon: Users,
    title: "Gestão de servidores",
    description:
      "Cadastro multi-núcleo com histórico temporal de vínculos e contingências.",
  },
  {
    icon: FileText,
    title: "Processos e reanálises",
    description:
      "Registro de múltiplas análises por processo, com suporte total a SEI, SIGA e SICAR (Lançamento, Análise, Mapeamento).",
  },
  {
    icon: BarChart3,
    title: "Dashboard analítico",
    description:
      "Produtividade em tempo real, índice de sobrecarga e projeções anuais.",
  },
  {
    icon: Sparkles,
    title: "Design institucional",
    description:
      "Estética premium com profundidade, transições suaves e modo claro/escuro puros.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Ambient background — sutil gradient radial */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent), transparent)",
          filter: "blur(80px)",
        }}
      />

      {/* Topbar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo size={22} />
        <ThemeToggle />
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="pt-16 pb-24 text-center"
        >
          <motion.div
            variants={fadeSlideUp}
            className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-muted)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            Versão inicial · SEMARH
          </motion.div>

          <motion.h1
            variants={fadeSlideUp}
            className="mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl"
          >
            Gestão inteligente para o
            <br />
            <span className="text-[var(--text-muted)]">
              Centro de Geotecnologia
            </span>
          </motion.h1>

          <motion.p
            variants={fadeSlideUp}
            className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-muted)]"
          >
            Organização por núcleos, produtividade em tempo real e visão
            institucional consolidada. Do cadastro ao dashboard, em uma única
            plataforma.
          </motion.p>

          <motion.div
            variants={fadeSlideUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              type="button"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--text)] px-5 py-2.5 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-0.5"
            >
              Entrar com Google
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="#recursos"
              className="rounded-full border px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            >
              Conhecer recursos
            </a>
          </motion.div>
        </motion.section>

        {/* Features grid */}
        <motion.section
          id="recursos"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid gap-4 pb-24 sm:grid-cols-2"
        >
          {features.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              variants={fadeSlideUp}
              whileHover={{ y: -2 }}
              transition={spring.gentle}
              className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)]">
                <Icon className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
              </div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                {description}
              </p>
            </motion.div>
          ))}
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-[var(--text-muted)]">
          <span>© 2026 SEMARH · CGEO</span>
          <Logo size={14} />
        </div>
      </footer>
    </div>
  );
}
