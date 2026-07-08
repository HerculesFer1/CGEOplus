"use client";

import { Pencil, Trash2, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NucleoBadge } from "@/components/ui/nucleo-badge";
import { formatDate } from "@/lib/utils";
import type { Servidor } from "@/lib/services/servidores.service";

import { displayVinculo } from "./vinculo-display";

interface Props {
  servidor: Servidor | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (s: Servidor) => void;
  onDelete: (s: Servidor) => void;
}

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  afastado: "Afastado",
};

const STATUS_VARIANT: Record<string, "accent" | "outline" | "default"> = {
  ativo: "accent",
  inativo: "default",
  afastado: "outline",
};

function initialsOf(nome: string, apelido: string) {
  const source = (nome || apelido || "").trim();
  if (!source) return "";
  const words = source.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ServidorDetailDialog({
  servidor,
  onOpenChange,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Dialog open={!!servidor} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {servidor && (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">
                Detalhes de {servidor.nome}
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-4">
              {servidor.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={servidor.fotoUrl}
                  alt=""
                  className="h-20 w-20 rounded-full border object-cover"
                />
              ) : (
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full text-xl font-semibold"
                  style={
                    servidor.nucleoCorTema
                      ? {
                          backgroundColor: `${servidor.nucleoCorTema}26`,
                          color: servidor.nucleoCorTema,
                          border: `1px solid ${servidor.nucleoCorTema}55`,
                        }
                      : undefined
                  }
                >
                  {initialsOf(servidor.nome, servidor.apelido) || (
                    <User className="h-8 w-8" strokeWidth={1.5} />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tracking-tight">
                  {servidor.apelido || servidor.nome}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {servidor.nome}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <NucleoBadge
                    nome={servidor.nucleoPrincipal}
                    cor={servidor.nucleoCorTema}
                  />
                  <Badge
                    variant={STATUS_VARIANT[servidor.status] ?? "default"}
                  >
                    {STATUS_LABEL[servidor.status] ?? servidor.status}
                  </Badge>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="E-mail" value={servidor.email} />
              <Field label="Matrícula" value={servidor.matricula} />
              <Field label="Cargo" value={servidor.cargo} />
              <Field
                label="Tipo de vínculo"
                value={displayVinculo(servidor.tipoVinculo)}
              />
              <Field label="Especialidade" value={servidor.especialidade} />
              <Field label="Formação" value={servidor.formacao} />
              <Field
                label="Data de ingresso"
                value={
                  servidor.dataIngresso
                    ? formatDate(servidor.dataIngresso)
                    : undefined
                }
              />
              <Field
                label="Data de nascimento"
                value={
                  servidor.dataNascimento
                    ? formatDate(servidor.dataNascimento)
                    : undefined
                }
              />
            </dl>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(servidor)}
                className="gap-2 text-[var(--danger)]"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                Remover
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                onClick={() => onEdit(servidor)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
                Editar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[var(--text)]">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}
