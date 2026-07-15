"use client";

import { useMemo, useState, useTransition } from "react";
import { HandHelping, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { adicionarApoioAction, removerApoioAction } from "./actions";
import type { ApoiadorRow, NucleoRow, ServidorOption } from "./nucleos-view";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nucleo: NucleoRow | null;
  servidores: ServidorOption[];
}

/**
 * Gerencia os APOIADORES de um núcleo — servidores que colaboram sem que este
 * seja seu núcleo principal. Filtra os candidatos elegíveis (nem principais
 * deste núcleo, nem já apoiando).
 */
export function ApoiosDialog({ open, onOpenChange, nucleo, servidores }: Props) {
  const [isPending, startTransition] = useTransition();
  const [servidorEscolhido, setServidorEscolhido] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");

  const elegiveis = useMemo(() => {
    if (!nucleo) return [];
    const apoiandoIds = new Set(nucleo.apoiadores.map((a) => a.servidorId));
    return servidores
      .filter((s) => s.nucleoAtualId !== nucleo.id) // não é principal aqui
      .filter((s) => !apoiandoIds.has(s.id));       // ainda não apoia aqui
  }, [nucleo, servidores]);

  function handleAdicionar() {
    if (!nucleo || !servidorEscolhido) return;
    const alvoId = servidorEscolhido;
    startTransition(async () => {
      const res = await adicionarApoioAction({
        servidorId: alvoId,
        nucleoId: nucleo.id,
        motivo: motivo.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Apoio adicionado.");
        setServidorEscolhido("");
        setMotivo("");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleRemover(vinculoId: string, nomeApoiador: string) {
    startTransition(async () => {
      const res = await removerApoioAction(vinculoId);
      if (res.ok) toast.success(`Apoio de ${nomeApoiador} encerrado.`);
      else toast.error(res.error);
    });
  }

  if (!nucleo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHelping className="h-5 w-5" strokeWidth={1.75} />
            Apoios do núcleo {nucleo.nome}
          </DialogTitle>
          <DialogDescription>
            Servidores que colaboram com este núcleo sem que ele seja o
            principal. O núcleo principal segue definido no cadastro/remanejamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Apoiadores atuais ({nucleo.apoiadores.length})
            </h3>
            {nucleo.apoiadores.length === 0 ? (
              <p className="rounded-lg border bg-[var(--surface)] p-3 text-sm text-[var(--text-muted)]">
                Nenhum apoio ativo. Adicione abaixo.
              </p>
            ) : (
              <ul className="space-y-2">
                {nucleo.apoiadores.map((a) => (
                  <li
                    key={a.vinculoId}
                    className="flex items-start justify-between gap-3 rounded-lg border bg-[var(--surface)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {a.apelido || a.nome}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Desde {a.dataInicio}
                        {a.motivo ? ` · ${a.motivo}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleRemover(a.vinculoId, a.apelido || a.nome)}
                      aria-label={`Remover apoio de ${a.apelido || a.nome}`}
                      title="Encerrar apoio"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 border-t pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Adicionar apoio
            </h3>
            {elegiveis.length === 0 ? (
              <p className="rounded-lg border bg-[var(--surface)] p-3 text-sm text-[var(--text-muted)]">
                Todos os servidores ativos já apoiam este núcleo ou o têm como
                principal.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Servidor</Label>
                  <Select
                    value={servidorEscolhido}
                    onValueChange={setServidorEscolhido}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um servidor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {elegiveis.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.apelido || s.nome}
                          {s.nucleoAtual && (
                            <span className="ml-2 text-xs text-[var(--text-muted)]">
                              (principal: {s.nucleoAtual})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex.: apoio pontual em backlog"
                    maxLength={120}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    disabled={isPending || !servidorEscolhido}
                    onClick={handleAdicionar}
                  >
                    {isPending ? "Adicionando..." : "Adicionar apoio"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Badge variant="outline" className="mr-auto">
            {nucleo.membrosAtivos} principais · {nucleo.apoiadores.length}{" "}
            apoiadores
          </Badge>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
