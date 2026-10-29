import type { NextConfig } from "next";

// No GitHub Pages o site fica em /<repo>/; o workflow define NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Versão dos dados: muda a cada build e entra na URL de cada JSON. O GitHub Pages guarda os
// arquivos em cache por 10 min; sem isso, quem já visitou recebe dados velhos com a página nova.
const dataVersion = process.env.GITHUB_SHA?.slice(0, 8) ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  output: "export",
  env: { NEXT_PUBLIC_DATA_V: dataVersion },
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
