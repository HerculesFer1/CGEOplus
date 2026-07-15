"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { NucleoBadge } from "@/components/ui/nucleo-badge";
import { fadeSlideUp, staggerContainer, spring } from "@/lib/design/motion";
import { cn } from "@/lib/utils";
import {
  TIPO_EVENTO_COR,
  TIPO_EVENTO_LABEL,
  type TipoEvento,
} from "@/lib/validators/evento";

import { EventoFormDialog } from "./evento-form-dialog";
import { deleteEventoAction } from "./actions";

export interface EventoRowSerial {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  tipo: TipoEvento;
  inicio: string; // ISO
  fim: string; // ISO
  diaInteiro: boolean;
  nucleoId: string | null;
  nucleoNome: string | null;
  nucleoCorTema: string | null;
  lembretesMin: number[];
}

interface NucleoOption {
  id: string;
  nome: string;
  corTema: string | null;
}

type ViewMode = "mes" | "semana" | "agenda";

interface Props {
  eventos: EventoRowSerial[];
  nucleos: NucleoOption[];
  view: ViewMode;
  ano: number;
  mes: number;
  dia: number;
}

const MES_NOMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIA_SEMANA_CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function EventosView({ eventos, nucleos, view, ano, mes, dia }: Props) {
  const router = useRouter();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<EventoRowSerial | null>(null);
  const [dataPreset, setDataPreset] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = useMemo(
    () =>
      eventos.map((e) => ({
        ...e,
        inicioDate: new Date(e.inicio),
        fimDate: new Date(e.fim),
      })),
    [eventos],
  );

  function trocarView(v: ViewMode) {
    if (v === view) return;
    const params = new URLSearchParams({
      view: v,
      ano: String(ano),
      mes: String(mes),
      dia: String(dia),
    });
    router.push(`/eventos?${params}`);
  }

  function navegar(delta: -1 | 1) {
    if (view === "mes") {
      const d = new Date(ano, mes - 1 + delta, 1);
      const params = new URLSearchParams({
        view: "mes",
        ano: String(d.getFullYear()),
        mes: String(d.getMonth() + 1),
      });
      router.push(`/eventos?${params}`);
    } else if (view === "semana") {
      const d = new Date(ano, mes - 1, dia + delta * 7);
      const params = new URLSearchParams({
        view: "semana",
        ano: String(d.getFullYear()),
        mes: String(d.getMonth() + 1),
        dia: String(d.getDate()),
      });
      router.push(`/eventos?${params}`);
    } else {
      // agenda: navega em blocos de 30 dias
      const d = new Date(ano, mes - 1, dia + delta * 30);
      const params = new URLSearchParams({
        view: "agenda",
        ano: String(d.getFullYear()),
        mes: String(d.getMonth() + 1),
        dia: String(d.getDate()),
      });
      router.push(`/eventos?${params}`);
    }
  }

  function irParaHoje() {
    const now = new Date();
    const params = new URLSearchParams({
      view,
      ano: String(now.getFullYear()),
      mes: String(now.getMonth() + 1),
      dia: String(now.getDate()),
    });
    router.push(`/eventos?${params}`);
  }

  function handleNew(preset?: Date) {
    setEditing(null);
    setDataPreset(preset ?? null);
    setOpenForm(true);
  }

  function handleEdit(e: EventoRowSerial) {
    setEditing(e);
    setDataPreset(null);
    setOpenForm(true);
  }

  function handleDelete(e: EventoRowSerial) {
    if (!confirm(`Remover evento "${e.titulo}"?`)) return;
    startTransition(async () => {
      const res = await deleteEventoAction(e.id);
      if (res.ok) toast.success("Evento removido.");
      else toast.error(res.error);
    });
  }

  const titulo =
    view === "mes"
      ? `${MES_NOMES[mes - 1]} · ${ano}`
      : view === "semana"
      ? tituloSemana(ano, mes, dia)
      : `Agenda · próximos 30 dias`;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      <motion.div
        variants={fadeSlideUp}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-sm text-[var(--text-muted)]">Gestão</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Eventos</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Agenda do setor · lembretes in-app aparecem no sino da barra
            superior.
          </p>
        </div>
        <Button onClick={() => handleNew()} className="gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Novo evento
        </Button>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        variants={fadeSlideUp}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]"
      >
        <div className="inline-flex rounded-full border bg-[var(--surface)] p-0.5">
          {(
            [
              { v: "mes", label: "Mês", icon: CalendarDays },
              { v: "semana", label: "Semana", icon: Calendar },
              { v: "agenda", label: "Agenda", icon: List },
            ] as const
          ).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => trocarView(v)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                view === v
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {view === v && (
                <motion.span
                  layoutId="eventos-view-pill"
                  transition={spring.snappy}
                  className="absolute inset-0 rounded-full bg-[var(--elevated)] shadow-[var(--shadow-sm)]"
                />
              )}
              <Icon className="relative h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navegar(-1)}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <span className="min-w-[220px] text-center text-sm font-medium">
            {titulo}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navegar(1)}
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button variant="outline" size="sm" onClick={irParaHoje}>
            Hoje
          </Button>
        </div>

        {/* Legenda compacta de tipos (só cores) */}
        <div className="hidden items-center gap-2 md:flex">
          {(Object.keys(TIPO_EVENTO_LABEL) as TipoEvento[]).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]"
              title={TIPO_EVENTO_LABEL[t]}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TIPO_EVENTO_COR[t] }}
              />
              {TIPO_EVENTO_LABEL[t]}
            </span>
          ))}
        </div>
      </motion.div>

      {view === "mes" && (
        <MesGrid
          ano={ano}
          mes={mes}
          eventos={parsed}
          onNew={handleNew}
          onEdit={handleEdit}
        />
      )}
      {view === "semana" && (
        <SemanaGrid
          ano={ano}
          mes={mes}
          dia={dia}
          eventos={parsed}
          onNew={handleNew}
          onEdit={handleEdit}
        />
      )}
      {view === "agenda" && (
        <AgendaLista
          ano={ano}
          mes={mes}
          dia={dia}
          eventos={parsed}
          onEdit={handleEdit}
          onDelete={handleDelete}
          disabled={isPending}
        />
      )}

      <EventoFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        evento={editing}
        dataPreset={dataPreset}
        nucleos={nucleos}
      />
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   VISÃO MÊS — grid 7×N
   -------------------------------------------------------------------------- */

type ParsedEvento = EventoRowSerial & { inicioDate: Date; fimDate: Date };

function MesGrid({
  ano,
  mes,
  eventos,
  onNew,
  onEdit,
}: {
  ano: number;
  mes: number;
  eventos: ParsedEvento[];
  onNew: (data: Date) => void;
  onEdit: (e: EventoRowSerial) => void;
}) {
  const primeiro = new Date(ano, mes - 1, 1);
  const ultimo = new Date(ano, mes, 0);
  // Grid começa na segunda anterior (ou a própria segunda)
  const dowInicio = (primeiro.getDay() + 6) % 7; // 0=Seg
  const inicioGrid = new Date(ano, mes - 1, 1 - dowInicio);
  const dias: Date[] = [];
  const total = Math.ceil((dowInicio + ultimo.getDate()) / 7) * 7;
  for (let i = 0; i < total; i++) {
    const d = new Date(inicioGrid);
    d.setDate(inicioGrid.getDate() + i);
    dias.push(d);
  }

  const hoje = new Date();
  const hojeStr = ymd(hoje);

  return (
    <motion.div
      variants={fadeSlideUp}
      className="overflow-hidden rounded-2xl border bg-[var(--elevated)] shadow-[var(--shadow-sm)]"
    >
      <div className="grid grid-cols-7 border-b bg-[var(--surface)]">
        {DIA_SEMANA_CURTO.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d, i) => {
          const dentroDoMes = d.getMonth() === mes - 1;
          const eDoDia = eventos.filter(
            (ev) => ymd(ev.inicioDate) === ymd(d),
          );
          const isHoje = ymd(d) === hojeStr;
          const isFimSemana = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Criar evento em ${ymd(d)}`}
              onClick={() => onNew(d)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onNew(d);
                }
              }}
              className={cn(
                "group relative flex min-h-[112px] cursor-pointer flex-col items-stretch gap-1.5 border-b border-r p-2 text-left transition-colors",
                (i + 1) % 7 === 0 && "border-r-0",
                !dentroDoMes && "bg-[var(--surface)]/40 opacity-45",
                dentroDoMes && isFimSemana && "bg-[var(--surface)]/20",
                dentroDoMes && !isFimSemana && "bg-[var(--elevated)]",
                "hover:bg-[var(--surface)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
              )}
            >
              {isHoje && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 bg-[var(--accent)]"
                />
              )}
              <div className="flex items-center justify-between">
                {eDoDia.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)]">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: TIPO_EVENTO_COR[eDoDia[0].tipo] }}
                      aria-hidden
                    />
                    {eDoDia.length} evento{eDoDia.length === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  className={cn(
                    "text-[13px] tabular-nums",
                    isHoje
                      ? "inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 font-semibold text-white shadow-[var(--shadow-sm)]"
                      : dentroDoMes
                      ? "font-medium text-[var(--text)]"
                      : "text-[var(--text-subtle)]",
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {eDoDia.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEdit(e);
                    }}
                    className="group/chip flex items-start gap-1.5 truncate rounded-md border-l-2 px-1.5 py-1 text-left text-[11px] font-medium transition-colors hover:brightness-125"
                    style={{
                      backgroundColor: `${TIPO_EVENTO_COR[e.tipo]}1F`,
                      borderLeftColor: TIPO_EVENTO_COR[e.tipo],
                      color: TIPO_EVENTO_COR[e.tipo],
                    }}
                    title={`${e.titulo} · ${TIPO_EVENTO_LABEL[e.tipo]}${e.local ? " · " + e.local : ""}`}
                  >
                    {!e.diaInteiro && (
                      <span className="shrink-0 font-semibold tabular-nums opacity-80">
                        {hhmm(e.inicioDate)}
                      </span>
                    )}
                    <span className="truncate">{e.titulo}</span>
                  </button>
                ))}
                {eDoDia.length > 3 && (
                  <span className="px-1 text-[10px] font-medium text-[var(--text-muted)]">
                    + {eDoDia.length - 3} evento{eDoDia.length - 3 === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   VISÃO SEMANA — 7 colunas de dia
   -------------------------------------------------------------------------- */

function SemanaGrid({
  ano,
  mes,
  dia,
  eventos,
  onNew,
  onEdit,
}: {
  ano: number;
  mes: number;
  dia: number;
  eventos: ParsedEvento[];
  onNew: (data: Date) => void;
  onEdit: (e: EventoRowSerial) => void;
}) {
  const anchor = new Date(ano, mes - 1, dia);
  const dow = (anchor.getDay() + 6) % 7;
  const segunda = new Date(anchor);
  segunda.setDate(anchor.getDate() - dow);
  const dias: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    return d;
  });

  const hojeStr = ymd(new Date());

  return (
    <motion.div
      variants={fadeSlideUp}
      className="grid gap-3 md:grid-cols-7"
    >
      {dias.map((d) => {
        const eDoDia = eventos.filter((e) => ymd(e.inicioDate) === ymd(d));
        const isHoje = ymd(d) === hojeStr;
        const isFimSemana = d.getDay() === 0 || d.getDay() === 6;
        return (
          <div
            key={ymd(d)}
            role="button"
            tabIndex={0}
            onClick={() => onNew(d)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onNew(d);
              }
            }}
            className={cn(
              "group relative flex min-h-[240px] cursor-pointer flex-col overflow-hidden rounded-xl border bg-[var(--elevated)] p-3 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
              isFimSemana && !isHoje && "bg-[var(--surface)]/60",
              isHoje && "ring-2 ring-[var(--accent)]",
            )}
          >
            {isHoje && (
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-[var(--accent)]"
              />
            )}
            <div className="mb-3 flex items-baseline justify-between">
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-widest",
                  isHoje ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
                )}
              >
                {DIA_SEMANA_CURTO[(d.getDay() + 6) % 7]}
              </span>
              <span
                className={cn(
                  "text-2xl tabular-nums",
                  isHoje
                    ? "font-bold text-[var(--accent)]"
                    : "font-semibold text-[var(--text)]",
                )}
              >
                {d.getDate()}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              {eDoDia.length === 0 ? (
                <div className="flex flex-1 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-[11px] italic text-[var(--text-subtle)]">
                    + adicionar
                  </span>
                </div>
              ) : (
                eDoDia.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEdit(e);
                    }}
                    className="rounded-lg border-l-2 bg-[var(--surface)] px-2 py-1.5 text-left text-xs transition-all hover:brightness-125 hover:shadow-[var(--shadow-sm)]"
                    style={{
                      borderLeftColor: TIPO_EVENTO_COR[e.tipo],
                      backgroundColor: `${TIPO_EVENTO_COR[e.tipo]}12`,
                    }}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="shrink-0 text-[10px] font-bold tabular-nums opacity-70"
                        style={{ color: TIPO_EVENTO_COR[e.tipo] }}
                      >
                        {e.diaInteiro ? "•" : hhmm(e.inicioDate)}
                      </span>
                      <span className="font-medium text-[var(--text)]">
                        {e.titulo}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: TIPO_EVENTO_COR[e.tipo] }}
                        aria-hidden
                      />
                      {TIPO_EVENTO_LABEL[e.tipo]}
                      {e.local && ` · ${e.local}`}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   VISÃO AGENDA — lista agrupada por dia
   -------------------------------------------------------------------------- */

function AgendaLista({
  ano,
  mes,
  dia,
  eventos,
  onEdit,
  onDelete,
  disabled,
}: {
  ano: number;
  mes: number;
  dia: number;
  eventos: ParsedEvento[];
  onEdit: (e: EventoRowSerial) => void;
  onDelete: (e: EventoRowSerial) => void;
  disabled: boolean;
}) {
  const inicio = new Date(ano, mes - 1, dia);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 30);

  const doPeriodo = eventos
    .filter((e) => e.inicioDate >= inicio && e.inicioDate < fim)
    .sort((a, b) => a.inicioDate.getTime() - b.inicioDate.getTime());

  const porDia = new Map<string, ParsedEvento[]>();
  for (const e of doPeriodo) {
    const k = ymd(e.inicioDate);
    if (!porDia.has(k)) porDia.set(k, []);
    porDia.get(k)!.push(e);
  }

  if (doPeriodo.length === 0) {
    return (
      <motion.div
        variants={fadeSlideUp}
        className="rounded-2xl border border-dashed p-12 text-center"
      >
        <Calendar
          className="mx-auto h-8 w-8 text-[var(--text-subtle)]"
          strokeWidth={1.25}
        />
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Nenhum evento nos próximos 30 dias.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerContainer} className="space-y-4">
      {Array.from(porDia.entries()).map(([k, lista]) => {
        const d = new Date(k);
        return (
          <motion.div
            variants={fadeSlideUp}
            key={k}
            className="rounded-2xl border bg-[var(--elevated)] p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="mb-3 flex items-baseline gap-3 border-b pb-2">
              <span className="text-2xl font-semibold tabular-nums">
                {d.getDate()}
              </span>
              <div className="text-sm">
                <div className="font-medium">
                  {DIA_SEMANA_CURTO[(d.getDay() + 6) % 7]}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {MES_NOMES[d.getMonth()]} · {d.getFullYear()}
                </div>
              </div>
            </div>
            <ul className="space-y-2">
              {lista.map((e) => (
                <li
                  key={e.id}
                  className="group flex items-start gap-3 rounded-lg p-2 hover:bg-[var(--surface)]"
                >
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: TIPO_EVENTO_COR[e.tipo] }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{e.titulo}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {e.diaInteiro
                          ? "dia inteiro"
                          : `${hhmm(e.inicioDate)}–${hhmm(e.fimDate)}`}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <span>{TIPO_EVENTO_LABEL[e.tipo]}</span>
                      {e.local && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" strokeWidth={1.75} />
                          {e.local}
                        </span>
                      )}
                      {e.nucleoNome && (
                        <NucleoBadge
                          nome={e.nucleoNome}
                          cor={e.nucleoCorTema}
                        />
                      )}
                    </div>
                    {e.descricao && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {e.descricao}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(e)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(e)}
                      disabled={disabled}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   utils
   -------------------------------------------------------------------------- */

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function tituloSemana(ano: number, mes: number, dia: number): string {
  const anchor = new Date(ano, mes - 1, dia);
  const dow = (anchor.getDay() + 6) % 7;
  const seg = new Date(anchor);
  seg.setDate(anchor.getDate() - dow);
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")} ${MES_NOMES[d.getMonth()].slice(0, 3).toLowerCase()}`;
  return `${fmt(seg)} — ${fmt(dom)} · ${dom.getFullYear()}`;
}
