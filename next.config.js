/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
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
}
module.exports = nextConfig
