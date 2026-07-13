import { ImportarTabs } from "./importar-tabs";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ aba?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { aba } = await searchParams;
  const hoje = new Date();
  return (
    <ImportarTabs
      anoDefault={hoje.getUTCFullYear()}
      mesDefault={hoje.getUTCMonth() + 1}
      abaDefault={aba === "ranking" ? "ranking" : "mensal"}
    />
  );
}
