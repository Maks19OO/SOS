import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Увеличиваем лимит размера тела запроса до 50MB для больших OpenAPI спецификаций
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  // Настройка для Docker
  output: 'standalone',
};

export default nextConfig;
