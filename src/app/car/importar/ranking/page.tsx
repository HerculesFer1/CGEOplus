import { ImportarRankingView } from "./importar-ranking-view";

export const dynamic = "force-dynamic";

export default function Page() {
  const hoje = new Date();
  return (
    <ImportarRankingView
      anoDefault={hoje.getUTCFullYear()}
      mesDefault={hoje.getUTCMonth() + 1}
    />
  );
}
