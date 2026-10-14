import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prisma precisa ser empacotado no standalone output
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client"],
  // Upload de logo do projeto (até 2 MB) via Server Action
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
