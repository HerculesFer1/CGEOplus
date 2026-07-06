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
  nucleoCreateSchema,
  type NucleoCreateInput,
} from "@/lib/validators/nucleo";
import type { NucleoRow } from "./nucleos-view";

import { createNucleoAction, updateNucleoAction } from "./actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nucleo: NucleoRow | null;
}

const DEFAULT_VALUES: NucleoCreateInput = {
  nome: "",
  descricao: "",
  corTema: "#8E8E93",
  minMembros: 2,
  ativo: true,
};

export function NucleoFormDialog({ open, onOpenChange, nucleo }: Props) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!nucleo;

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
              corTema: nucleo.corTema ?? "#8E8E93",
              minMembros: nucleo.minMembros,
              ativo: nucleo.ativo,
            }
          : DEFAULT_VALUES,
      );
    }
  }, [open, nucleo, form]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar núcleo" : "Novo núcleo"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do núcleo."
              : "Cadastre um novo núcleo operacional."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
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

          <Field label="Cor tema" error={errors.corTema?.message}>
            <Input {...form.register("corTema")} placeholder="#0071E3" />
          </Field>

          <Field label="Mínimo de membros" error={errors.minMembros?.message}>
            <Input
              type="number"
              min={1}
              {...form.register("minMembros", { valueAsNumber: true })}
            />
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
