"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  nucleoCreateSchema,
  type NucleoCreateInput,
} from "@/lib/validators/nucleo";
import type { NucleoRow, ServidorOption } from "./nucleos-view";

import { createNucleoAction, updateNucleoAction } from "./actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nucleo: NucleoRow | null;
  servidores: ServidorOption[];
  membrosAtuaisIds: string[];
}

const PALETA = [
  { hex: "#0071E3", nome: "Azul" },
  { hex: "#30D158", nome: "Verde" },
  { hex: "#FF9F0A", nome: "Laranja" },
  { hex: "#FF453A", nome: "Vermelho" },
  { hex: "#8E8E93", nome: "Cinza" },
  { hex: "#BF5AF2", nome: "Roxo" },
  { hex: "#FF375F", nome: "Rosa" },
  { hex: "#64D2FF", nome: "Ciano" },
  { hex: "#FFD60A", nome: "Amarelo" },
  { hex: "#5E5CE6", nome: "Índigo" },
];

export function NucleoFormDialog({
  open,
  onOpenChange,
  nucleo,
  servidores,
  membrosAtuaisIds,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!nucleo;

  const DEFAULT_VALUES: NucleoCreateInput = {
    nome: "",
    descricao: "",
    corTema: "#0071E3",
    minMembros: 2,
    ativo: true,
    membrosIds: [],
  };

  const form = useForm<NucleoCreateInput>({
    resolver: zodResolver(nucleoCreateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        nucleo
          ? {
              nome: nucleo.nome,
              descricao: nucleo.descricao ?? "",
              corTema: nucleo.corTema ?? "#0071E3",
              minMembros: nucleo.minMembros,
              ativo: nucleo.ativo,
              membrosIds: membrosAtuaisIds,
            }
          : DEFAULT_VALUES,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nucleo, membrosAtuaisIds]);

  function onSubmit(values: NucleoCreateInput) {
    startTransition(async () => {
      const res = isEdit
        ? await updateNucleoAction({ id: nucleo!.id, ...values })
        : await createNucleoAction(values);
      if (res.ok) {
        toast.success(isEdit ? "Núcleo atualizado." : "Núcleo criado.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const errors = form.formState.errors;
  const corSelecionada = form.watch("corTema");
  const membrosIds = form.watch("membrosIds");

  function toggleMembro(id: string) {
    const set = new Set(membrosIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    form.setValue("membrosIds", Array.from(set), { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar núcleo" : "Novo núcleo"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações e composição do núcleo."
              : "Cadastre um novo núcleo operacional e defina os membros."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome" error={errors.nome?.message} className="sm:col-span-2">
              <Input {...form.register("nome")} placeholder="Ex.: Licenciamento" />
            </Field>

            <Field
              label="Descrição"
              error={errors.descricao?.message}
              className="sm:col-span-2"
            >
              <Input {...form.register("descricao")} placeholder="Opcional" />
            </Field>

            <Field label="Mínimo de membros" error={errors.minMembros?.message}>
              <Input
                type="number"
                min={1}
                {...form.register("minMembros", { valueAsNumber: true })}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Cor tema</Label>
            <div className="flex flex-wrap gap-1.5">
              {PALETA.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() =>
                    form.setValue("corTema", c.hex, { shouldValidate: true })
                  }
                  aria-label={c.nome}
                  title={c.nome}
                  className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-[var(--accent)] focus:ring-offset-[var(--elevated)] ${corSelecionada === c.hex ? "ring-1 ring-offset-1 ring-[var(--text)] ring-offset-[var(--elevated)]" : ""}`}
                  style={{ backgroundColor: c.hex }}
                >
                  {corSelecionada === c.hex && (
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                  )}
                </button>
              ))}
            </div>
            {errors.corTema?.message && (
              <p className="text-xs text-[var(--danger)]">{errors.corTema.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label>Membros deste núcleo</Label>
              <span className="text-xs text-[var(--text-muted)]">
                {membrosIds.length} selecionado
                {membrosIds.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Servidores marcados terão este núcleo como principal. Vínculos
              anteriores serão encerrados automaticamente.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-xl border bg-[var(--surface)]">
              {servidores.length === 0 ? (
                <p className="p-4 text-center text-sm text-[var(--text-muted)]">
                  Nenhum servidor ativo cadastrado.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {servidores.map((s) => {
                    const checked = membrosIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[var(--elevated)]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMembro(s.id)}
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{s.apelido}</p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {s.nome}
                            </p>
                          </div>
                          {s.nucleoAtual ? (
                            <Badge variant="outline" className="text-[10px]">
                              {s.nucleoAtual}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              sem núcleo
                            </Badge>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Salvando..."
                : isEdit
                ? "Salvar alterações"
                : "Criar núcleo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
