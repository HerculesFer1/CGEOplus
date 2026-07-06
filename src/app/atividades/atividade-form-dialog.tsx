"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  COMPLEXIDADE,
  atividadeCreateSchema,
  type AtividadeCreateInput,
} from "@/lib/validators/atividade";
import type { AtividadeRow } from "./atividades-view";

import { createAtividadeAction, updateAtividadeAction } from "./actions";

interface NucleoOption {
  id: string;
  nome: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atividade: AtividadeRow | null;
  nucleos: NucleoOption[];
}

const NONE_VALUE = "__none__";

export function AtividadeFormDialog({
  open,
  onOpenChange,
  atividade,
  nucleos,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!atividade;

  const DEFAULT_VALUES: AtividadeCreateInput = {
    nome: "",
    complexidade: "N2",
    nucleoId: "",
    descricao: "",
    ativo: true,
  };

  const form = useForm<AtividadeCreateInput>({
    resolver: zodResolver(atividadeCreateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        atividade
          ? {
              nome: atividade.nome,
              complexidade: atividade.complexidade,
              nucleoId: atividade.nucleoId ?? "",
              descricao: atividade.descricao ?? "",
              ativo: atividade.ativo,
            }
          : DEFAULT_VALUES,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, atividade]);

  function onSubmit(values: AtividadeCreateInput) {
    startTransition(async () => {
      const res = isEdit
        ? await updateAtividadeAction({ id: atividade!.id, ...values })
        : await createAtividadeAction(values);
      if (res.ok) {
        toast.success(isEdit ? "Atividade atualizada." : "Atividade criada.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const errors = form.formState.errors;
  const nucleoIdValue = form.watch("nucleoId") || NONE_VALUE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar atividade" : "Nova atividade"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações da atividade."
              : "Cadastre uma nova atividade no catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Nome" error={errors.nome?.message} className="sm:col-span-2">
            <Input {...form.register("nome")} placeholder="Ex.: Análise CAR" />
          </Field>

          <Field label="Complexidade" error={errors.complexidade?.message}>
            <Select
              value={form.watch("complexidade")}
              onValueChange={(v) =>
                form.setValue("complexidade", v as AtividadeCreateInput["complexidade"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPLEXIDADE.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Núcleo" error={errors.nucleoId?.message}>
            <Select
              value={nucleoIdValue}
              onValueChange={(v) =>
                form.setValue("nucleoId", v === NONE_VALUE ? "" : v, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um núcleo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sem núcleo</SelectItem>
                {nucleos.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Descrição"
            error={errors.descricao?.message}
            className="sm:col-span-2"
          >
            <Input {...form.register("descricao")} placeholder="Opcional" />
          </Field>

          <DialogFooter className="sm:col-span-2 mt-2">
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
                : "Criar atividade"}
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
