import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
