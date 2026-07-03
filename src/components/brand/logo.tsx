import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Tamanho em px (altura do texto). Padrão: 24 */
  size?: number;
  /** Renderiza somente o wordmark, sem link/wrapper */
  as?: "span" | "div";
}

/**
 * Wordmark CGEO+ — Variação Geometric.
 * O "+" fica em cor accent, o restante herda a cor de texto.
 */
export function Logo({ className, size = 24, as: Tag = "span" }: LogoProps) {
  return (
    <Tag
      className={cn(
        "font-display font-semibold tracking-tight select-none inline-flex items-baseline",
        className,
      )}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
      aria-label="CGEO+"
    >
      <span>CGEO</span>
      <span
        className="ml-[0.05em] font-medium"
        style={{ color: "var(--accent)" }}
        aria-hidden
      >
        +
      </span>
    </Tag>
  );
}
