"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  aprovarPerfilAction,
  recusarPerfilAction,
  revogarPerfilAction,
} from "./actions";

interface Props {
  perfilId: string;
  nome: string;
  variant: "pendente" | "ativo" | "admin";
}

export function PerfilActions({ perfilId, nome, variant }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"recusar" | "revogar" | null>(
    null,
  );

  function handleAprovar() {
    startTransition(async () => {
      const res = await aprovarPerfilAction(perfilId);
      if (res.ok) toast.success(`${nome} aprovado(a).`);
      else toast.error(res.error);
    });
  }

  function handleConfirmar() {
    if (!confirmKind) return;
    startTransition(async () => {
      const res =
        confirmKind === "recusar"
          ? await recusarPerfilAction(perfilId)
          : await revogarPerfilAction(perfilId);
      if (res.ok) {
        toast.success(
          confirmKind === "recusar"
            ? `Cadastro de ${nome} recusado.`
            : `Acesso de ${nome} revogado.`,
        );
      } else {
        toast.error(res.error);
      }
      setConfirmOpen(false);
      setConfirmKind(null);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {variant === "pendente" && (
        <>
          <Button
            size="sm"
            onClick={handleAprovar}
            disabled={isPending}
          >
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setConfirmKind("recusar");
              setConfirmOpen(true);
            }}
          >
            Recusar
          </Button>
        </>
      )}

      {variant === "ativo" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => {
            setConfirmKind("revogar");
            setConfirmOpen(true);
          }}
        >
          Revogar acesso
        </Button>
      )}

      {variant === "admin" && (
        <span className="text-xs text-[var(--text-subtle)]">—</span>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmKind === "recusar"
                ? "Recusar cadastro?"
                : "Revogar acesso?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmKind === "recusar" ? (
                <>
                  A conta de <strong>{nome}</strong> será removida
                  definitivamente do sistema. A pessoa pode se cadastrar de novo
                  se quiser.
                </>
              ) : (
                <>
                  <strong>{nome}</strong> perde o acesso imediatamente e volta
                  para a fila de pendentes. Você pode aprovar de novo depois.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmar();
              }}
              disabled={isPending}
              className="bg-[var(--danger)] text-white hover:opacity-90"
            >
              {isPending ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

