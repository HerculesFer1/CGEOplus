import { redirect } from "next/navigation";

import { parseRoteiro } from "@/lib/apresentacao/registry";

import { RoteiroPlayer } from "./roteiro-player";

export const metadata = {
  title: "CGEO+ · Apresentação encadeada",
};

interface PageProps {
  searchParams: Promise<{ modulos?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const roteiro = parseRoteiro(params.modulos);
  if (roteiro.length === 0) redirect("/apresentacao/dashboards");
  return <RoteiroPlayer roteiro={roteiro} />;
}
