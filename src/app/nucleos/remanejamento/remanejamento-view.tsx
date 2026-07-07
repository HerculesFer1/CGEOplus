"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { moveServidorAction } from "../actions";

const UNASSIGNED = "__sem_nucleo__";

interface Nucleo {
  id: string;
  nome: string;
  corTema: string | null;
}

interface Servidor {
  id: string;
  nome: string;
  apelido: string;
  cargo: string;
  nucleoAtualId: string | null;
}

interface Column extends Nucleo {}

interface Props {
  nucleos: Nucleo[];
  servidoresIniciais: Servidor[];
}

export function RemanejamentoView({ nucleos, servidoresIniciais }: Props) {
  const [servidores, setServidores] = useState(servidoresIniciais);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const columns: Column[] = [
    { id: UNASSIGNED, nome: "Sem núcleo", corTema: null },
    ...nucleos,
  ];

  function byColumn(colId: string) {
    return servidores.filter(
      (s) => (s.nucleoAtualId ?? UNASSIGNED) === colId,
    );
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;

    const servidorId = String(e.active.id);
    const targetCol = String(e.over.id);
    const servidor = servidores.find((s) => s.id === servidorId);
    if (!servidor) return;
    const currentCol = servidor.nucleoAtualId ?? UNASSIGNED;
    if (currentCol === targetCol) return;

    const targetNucleoId = targetCol === UNASSIGNED ? null : targetCol;
    const prevSnapshot = servidores;

    // Optimistic update
    setServidores((servs) =>
      servs.map((s) =>
        s.id === servidorId ? { ...s, nucleoAtualId: targetNucleoId } : s,
      ),
    );

    startTransition(async () => {
      const res = await moveServidorAction(servidorId, targetNucleoId);
      if (res.ok) {
        const targetName =
          columns.find((c) => c.id === targetCol)?.nome ?? "novo núcleo";
        toast.success(`${servidor.apelido} movido para ${targetName}`);
      } else {
        setServidores(prevSnapshot);
        toast.error(res.error);
      }
    });
  }

  const activeServidor = servidores.find((s) => s.id === activeId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/nucleos"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Núcleos
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Gestão</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Remanejamento de equipe
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
              Arraste servidores entre os núcleos para reorganizar os times
              conforme demandas e recomposições. O vínculo anterior é encerrado
              e um novo é aberto automaticamente.
            </p>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid gap-4 pb-4"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((col) => (
            <ColumnBoard
              key={col.id}
              col={col}
              servidores={byColumn(col.id)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeServidor ? (
            <ServidorCardStatic s={activeServidor} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ColumnBoard({
  col,
  servidores,
}: {
  col: Column;
  servidores: Servidor[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const isUnassigned = col.id === UNASSIGNED;

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-col rounded-2xl border bg-[var(--elevated)] transition-colors ${isOver ? "border-[var(--accent)] shadow-[var(--shadow-md)]" : ""} ${isUnassigned ? "border-dashed" : ""}`}
    >
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: col.corTema ?? "#8E8E93" }}
          />
          <h3 className="font-semibold">{col.nome}</h3>
          <span className="ml-auto rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
            {servidores.length}
          </span>
        </div>
      </div>
      <div className="min-h-40 flex-1 space-y-2 overflow-y-auto p-3">
        {servidores.length === 0 && (
          <p className="py-6 text-center text-xs text-[var(--text-subtle)]">
            {isUnassigned
              ? "Nenhum servidor sem vínculo."
              : "Solte um servidor aqui."}
          </p>
        )}
        {servidores.map((s) => (
          <DraggableCard key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ s }: { s: Servidor }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: s.id });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.4 : 1,
    ...(transform && {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group flex cursor-grab items-center gap-2 rounded-xl border bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] active:cursor-grabbing"
    >
      <GripVertical
        className="h-3.5 w-3.5 text-[var(--text-subtle)] opacity-0 transition-opacity group-hover:opacity-100"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{s.apelido}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">{s.nome}</p>
      </div>
    </div>
  );
}

function ServidorCardStatic({
  s,
  isOverlay,
}: {
  s: Servidor;
  isOverlay?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border bg-[var(--elevated)] p-3 ${isOverlay ? "cursor-grabbing shadow-[var(--shadow-lg)]" : ""}`}
    >
      <GripVertical
        className="h-3.5 w-3.5 text-[var(--text-subtle)]"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{s.apelido}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">{s.nome}</p>
      </div>
    </div>
  );
}
