import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // === PHASE 1: Externalize heavy FOSS libs that only run in worker process ===
  // These libs (Baileys, Xenova) are imported lazily but Next.js still tries to bundle them.
  // Marking as external keeps them out of the Vercel function bundle (smaller, faster cold start).
  // They're still installed in node_modules so the worker process can use them.
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    '@xenova/transformers',
    'onnxruntime-node',
    'sharp',
    'jimp',
    'pdfjs-dist',
    'pdf-parse',
    'canvas',
  ],
};

export default nextConfig;
