import { APRESENTACAO_MODULOS } from "@/lib/apresentacao/registry";

import { RoteiroMontador } from "./roteiro-montador";

export const metadata = {
  title: "CGEO+ · Apresentação de dashboards",
};

export default function Page() {
  return <RoteiroMontador modulos={APRESENTACAO_MODULOS} />;
}
