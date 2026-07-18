import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Server Actions do módulo /car recebem o CSV bruto do SICAR (~40MB, 334k linhas).
   * Default do Next é 1MB — subimos para 100MB para acomodar as importações mensais.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },

  /**
   * Garante que os `.md` da documentação (`docs/metodologia/`) entrem no bundle
   * serverless do Vercel — a rota `/docs/[slug]` os lê via `fs`. As páginas são
   * pré-geradas (SSG), então na prática o conteúdo é lido no build; isto é
   * salvaguarda caso a rota passe a renderizar sob demanda.
   */
  outputFileTracingIncludes: {
    "/docs/[slug]": ["./docs/metodologia/**/*"],
  },

  /**
   * Redirects de singular → plural.
   * Corrige URLs digitadas manualmente ou favoritos antigos que
   * usam o nome do módulo no singular.
   */
  async redirects() {
    return [
      { source: "/servidor", destination: "/servidores", permanent: true },
      { source: "/servidor/:path*", destination: "/servidores/:path*", permanent: true },
      { source: "/nucleo", destination: "/nucleos", permanent: true },
      { source: "/nucleo/:path*", destination: "/nucleos/:path*", permanent: true },
      { source: "/atividade", destination: "/atividades", permanent: true },
      { source: "/atividade/:path*", destination: "/atividades/:path*", permanent: true },
      // Processos foi reorganizado para dentro de Monitoramento (2026-07-15).
      // Mantemos a URL antiga funcionando para favoritos/bookmarks legados.
      { source: "/processo", destination: "/monitoramento/processos", permanent: true },
      { source: "/processo/:path*", destination: "/monitoramento/processos/:path*", permanent: true },
      { source: "/processos", destination: "/monitoramento/processos", permanent: true },
      { source: "/processos/:path*", destination: "/monitoramento/processos/:path*", permanent: true },
      { source: "/meta", destination: "/metas", permanent: true },
      { source: "/meta/:path*", destination: "/metas/:path*", permanent: true },
      { source: "/evento", destination: "/eventos", permanent: true },
      { source: "/evento/:path*", destination: "/eventos/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
