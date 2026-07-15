import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CGEO+ · Apresentação semanal",
};

/**
 * Layout dedicado do modo apresentação — sem sidebar, sem topbar.
 * A view aplica cores escuras fixas por classe (não depende do tema do
 * usuário), pra ficar sempre legível na TV do setor independente do
 * preset light/dark que o servidor esteja usando na app.
 */
export default function ApresentacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">{children}</div>
  );
}
