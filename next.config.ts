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
      { source: "/processo", destination: "/processos", permanent: true },
      { source: "/processo/:path*", destination: "/processos/:path*", permanent: true },
      { source: "/meta", destination: "/metas", permanent: true },
      { source: "/meta/:path*", destination: "/metas/:path*", permanent: true },
      { source: "/evento", destination: "/eventos", permanent: true },
      { source: "/evento/:path*", destination: "/eventos/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
