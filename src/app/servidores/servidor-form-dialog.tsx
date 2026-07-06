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
  servidorCreateSchema,
  TIPO_VINCULO,
  type ServidorCreateInput,
} from "@/lib/validators/servidor";
import type { Servidor } from "@/lib/services/servidores.service";

import { createServidorAction, updateServidorAction } from "./actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servidor: Servidor | null;
  nucleosDisponiveis: string[];
}

export function ServidorFormDialog({
  open,
  onOpenChange,
  servidor,
  nucleosDisponiveis,
}: Props) {
  const DEFAULT_VALUES: ServidorCreateInput = {
    nome: "",
    apelido: "",
    email: "",
    matricula: "",
    cargo: "",
    tipoVinculo: "Consultor PSI",
    especialidade: "",
    dataIngresso: new Date().toISOString().slice(0, 10),
    status: "ativo",
    nucleoPrincipal: nucleosDisponiveis[0] ?? "",
  };
  const [isPending, startTransition] = useTransition();
  const isEdit = !!servidor;

  const form = useForm<ServidorCreateInput>({
    resolver: zodResolver(servidorCreateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        servidor
          ? {
              nome: servidor.nome,
              apelido: servidor.apelido,
              email: servidor.email,
              matricula: servidor.matricula ?? "",
              cargo: servidor.cargo,
              tipoVinculo: servidor.tipoVinculo,
              especialidade: servidor.especialidade ?? "",
              dataIngresso: servidor.dataIngresso,
              status: servidor.status,
              nucleoPrincipal: servidor.nucleoPrincipal,
            }
          : DEFAULT_VALUES,
      );
    }
  }, [open, servidor, form]);

  function onSubmit(values: ServidorCreateInput) {
    startTransition(async () => {
      const res = isEdit
        ? await updateServidorAction({ id: servidor!.id, ...values })
        : await createServidorAction(values);

      if (res.ok) {
        toast.success(isEdit ? "Servidor atualizado." : "Servidor cadastrado.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar servidor" : "Novo servidor"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do colaborador."
              : "Cadastre um novo membro da equipe CGEO."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Nome completo" error={errors.nome?.message} className="sm:col-span-2">
            <Input {...form.register("nome")} placeholder="Ex.: Marco Aurélio" />
          </Field>

          <Field label="Apelido (usado na planilha)" error={errors.apelido?.message}>
            <Input {...form.register("apelido")} placeholder="Ex.: Marco" />
          </Field>

          <Field label="E-mail institucional" error={errors.email?.message}>
            <Input type="email" {...form.register("email")} placeholder="ex.: marco@semarh.gov.br" />
          </Field>

          <Field label="Matrícula" error={errors.matricula?.message}>
            <Input {...form.register("matricula")} placeholder="Opcional" />
          </Field>

          <Field label="Cargo" error={errors.cargo?.message}>
            <Input {...form.register("cargo")} placeholder="Ex.: Consultor PSI/Esp. Geoprocessamento" />
          </Field>

          <Field label="Tipo de vínculo" error={errors.tipoVinculo?.message}>
            <Select
              value={form.watch("tipoVinculo")}
              onValueChange={(v) =>
                form.setValue("tipoVinculo", v as ServidorCreateInput["tipoVinculo"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_VINCULO.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Núcleo principal" error={errors.nucleoPrincipal?.message}>
            <Select
              value={form.watch("nucleoPrincipal")}
              onValueChange={(v) =>
                form.setValue("nucleoPrincipal", v, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nucleosDisponiveis.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Especialidade" error={errors.especialidade?.message}>
            <Input {...form.register("especialidade")} placeholder="Opcional" />
          </Field>

          <Field label="Data de ingresso" error={errors.dataIngresso?.message}>
            <Input type="date" {...form.register("dataIngresso")} />
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
                : "Cadastrar"}
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
      {error && (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      )}
    </div>
  );
}
