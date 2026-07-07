"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { ArrowLeft, GripVertical, UserMinus } from "lucide-react";
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

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Hierarquia: Gerência primeiro, depois núcleos em ordem alfabética.
function sortNucleos(list: Nucleo[]): Nucleo[] {
  return [...list].sort((a, b) => {
    const aGer = normalize(a.nome) === "gerencia";
    const bGer = normalize(b.nome) === "gerencia";
    if (aGer && !bGer) return -1;
    if (!aGer && bGer) return 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export function RemanejamentoView({ nucleos, servidoresIniciais }: Props) {
  const [servidores, setServidores] = useState(servidoresIniciais);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    servidorId: string;
    x: number;
    y: number;
  } | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const sortedNucleos = sortNucleos(nucleos);
  const unassignedCol: Column = {
    id: UNASSIGNED,
    nome: "Sem núcleo",
    corTema: null,
  };
  const allColumns: Column[] = [unassignedCol, ...sortedNucleos];

  function byColumn(colId: string) {
    return servidores.filter(
      (s) => (s.nucleoAtualId ?? UNASSIGNED) === colId,
    );
  }

  function moveServidor(servidorId: string, targetCol: string) {
    const servidor = servidores.find((s) => s.id === servidorId);
    if (!servidor) return;
    const currentCol = servidor.nucleoAtualId ?? UNASSIGNED;
    if (currentCol === targetCol) return;

    const targetNucleoId = targetCol === UNASSIGNED ? null : targetCol;
    const prevSnapshot = servidores;

    setServidores((servs) =>
      servs.map((s) =>
        s.id === servidorId ? { ...s, nucleoAtualId: targetNucleoId } : s,
      ),
    );

    startTransition(async () => {
      const res = await moveServidorAction(servidorId, targetNucleoId);
      if (res.ok) {
        const targetName =
          allColumns.find((c) => c.id === targetCol)?.nome ?? "novo núcleo";
        toast.success(`${servidor.apelido} movido para ${targetName}`);
      } else {
        setServidores(prevSnapshot);
        toast.error(res.error);
      }
    });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    moveServidor(String(e.active.id), String(e.over.id));
  }

  function openMenu(servidorId: string, x: number, y: number) {
    setMenu({ servidorId, x, y });
  }
  function closeMenu() {
    setMenu(null);
  }

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const onScroll = () => closeMenu();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [menu]);

  const activeServidor = servidores.find((s) => s.id === activeId) ?? null;
  const menuServidor = menu
    ? (servidores.find((s) => s.id === menu.servidorId) ?? null)
    : null;

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
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Gestão</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Remanejamento de equipe
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
              Arraste ou clique com o botão direito em um servidor para movê-lo
              entre os núcleos. O vínculo anterior é encerrado e um novo é
              aberto automaticamente.
            </p>
          </div>
          <UnassignedDropZone
            servidores={byColumn(UNASSIGNED)}
            onContext={openMenu}
          />
        </div>

        <div
          className="grid gap-4 pb-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          }}
        >
          {sortedNucleos.map((col) => (
            <ColumnBoard
              key={col.id}
              col={col}
              servidores={byColumn(col.id)}
              onContext={openMenu}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeServidor ? (
            <ServidorCardStatic s={activeServidor} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {menu && menuServidor && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          servidor={menuServidor}
          columns={allColumns}
          currentColId={menuServidor.nucleoAtualId ?? UNASSIGNED}
          onSelect={(colId) => {
            moveServidor(menu.servidorId, colId);
            closeMenu();
          }}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

function UnassignedDropZone({
  servidores,
  onContext,
}: {
  servidores: Servidor[];
  onContext: (id: string, x: number, y: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-full max-w-sm shrink-0 flex-col rounded-2xl border border-dashed bg-[var(--elevated)] p-3 transition-colors sm:w-72 ${
        isOver ? "border-[var(--accent)] shadow-[var(--shadow-md)]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <UserMinus className="h-4 w-4 text-[var(--text-muted)]" />
        <h3 className="text-sm font-semibold">Sem núcleo</h3>
        <span className="ml-auto rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
          {servidores.length}
        </span>
      </div>
      <div
        className="mt-2 h-[62px] snap-y snap-mandatory overflow-y-auto pr-1 [scrollbar-width:thin]"
        style={{ scrollBehavior: "smooth" }}
      >
        {servidores.length === 0 ? (
          <p className="py-3 text-center text-xs text-[var(--text-subtle)]">
            Solte aqui para desvincular.
          </p>
        ) : (
          servidores.map((s) => (
            <div key={s.id} className="snap-start py-0.5">
              <DraggableCard s={s} onContext={onContext} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ColumnBoard({
  col,
  servidores,
  onContext,
}: {
  col: Column;
  servidores: Servidor[];
  onContext: (id: string, x: number, y: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-col rounded-2xl border bg-[var(--elevated)] transition-colors ${isOver ? "border-[var(--accent)] shadow-[var(--shadow-md)]" : ""}`}
    >
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: col.corTema ?? "#8E8E93" }}
          />
          <h3 className="truncate font-semibold">{col.nome}</h3>
          <span className="ml-auto rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
            {servidores.length}
          </span>
        </div>
      </div>
      <div className="min-h-40 flex-1 space-y-2 overflow-y-auto p-3">
        {servidores.length === 0 && (
          <p className="py-6 text-center text-xs text-[var(--text-subtle)]">
            Solte um servidor aqui.
          </p>
        )}
        {servidores.map((s) => (
          <DraggableCard key={s.id} s={s} onContext={onContext} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({
  s,
  onContext,
}: {
  s: Servidor;
  onContext: (id: string, x: number, y: number) => void;
}) {
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
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(s.id, e.clientX, e.clientY);
      }}
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

function ContextMenu({
  x,
  y,
  servidor,
  columns,
  currentColId,
  onSelect,
  onClose,
}: {
  x: number;
  y: number;
  servidor: Servidor;
  columns: Column[];
  currentColId: string;
  onSelect: (colId: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y, ready: false });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let nx = x;
    let ny = y;
    if (nx + rect.width > window.innerWidth - margin) {
      nx = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (ny + rect.height > window.innerHeight - margin) {
      ny = Math.max(margin, window.innerHeight - rect.height - margin);
    }
    setPos({ x: nx, y: ny, ready: true });
  }, [x, y]);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Mover ${servidor.apelido}`}
        className="fixed z-50 w-60 rounded-xl border bg-[var(--elevated)] p-1.5 shadow-[var(--shadow-lg)]"
        style={{
          top: pos.y,
          left: pos.x,
          visibility: pos.ready ? "visible" : "hidden",
        }}
      >
        <div className="mb-1 border-b px-2 pb-1.5">
          <p className="truncate text-xs font-medium">{servidor.apelido}</p>
          <p className="truncate text-[11px] text-[var(--text-muted)]">
            Mover para…
          </p>
        </div>
        <ul className="max-h-72 overflow-y-auto text-sm">
          {columns.map((col) => {
            const isCurrent = col.id === currentColId;
            const isUnassigned = col.id === UNASSIGNED;
            return (
              <li key={col.id}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={isCurrent}
                  onClick={() => onSelect(col.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    isCurrent
                      ? "cursor-default text-[var(--text-subtle)]"
                      : "hover:bg-[var(--surface)]"
                  }`}
                >
                  {isUnassigned ? (
                    <UserMinus className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  ) : (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: col.corTema ?? "#8E8E93" }}
                    />
                  )}
                  <span className="truncate">{col.nome}</span>
                  {isCurrent && (
                    <span className="ml-auto text-[10px] text-[var(--text-subtle)]">
                      atual
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
