import { cn } from "@/lib/utils";

interface Props {
  nome: string | null | undefined;
  cor?: string | null;
  className?: string;
}

/**
 * Badge que herda a cor tema real do núcleo (hex do banco), com fundo
 * translúcido e texto na cor. Fallback para estilo "muted" quando não há cor.
 */
export function NucleoBadge({ nome, cor, className }: Props) {
  if (!nome) return null;

  const style = cor
    ? {
        backgroundColor: `${cor}1a`, // ~10% opacity
        color: cor,
        borderColor: `${cor}33`, // ~20% opacity
      }
    : undefined;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        !cor && "bg-[var(--surface)] text-[var(--text-muted)]",
        className,
      )}
      style={style}
    >
      {nome}
    </div>
  );
}
