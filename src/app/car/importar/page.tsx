import { ImportarCarView } from "./importar-view";

export const dynamic = "force-dynamic";

export default function Page() {
  const hoje = new Date();
  return (
    <ImportarCarView
      anoDefault={hoje.getUTCFullYear()}
      mesDefault={hoje.getUTCMonth() + 1}
    />
  );
}
