import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // === FIX: Hapus output: "standalone" — tidak cocok untuk Vercel ===
  // Vercel punya build system sendiri, tidak butuh standalone mode
  // Standalone mode + cp commands menyebabkan build fail di Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // === PHASE 1: Externalize heavy FOSS libs that only run in worker process ===
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
