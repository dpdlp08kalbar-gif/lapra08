import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LAPRA 08 - Sistem Informasi Internal Global",
  description: "Sistem informasi internal Laskar Prabowo 08 (LAPRA 08) - Portal resmi DPN, DPD, dan DPC se-Indonesia.",
  keywords: ["LAPRA 08", "Laskar Prabowo 08", "Sistem Informasi", "Portal Organisasi", "Indonesia"],
  authors: [{ name: "DPN LAPRA 08" }],
  icons: {
    icon: "/logo-lapra08.png",
    apple: "/logo-lapra08.png",
  },
  openGraph: {
    title: "LAPRA 08 - Sistem Informasi Internal",
    description: "Portal resmi Laskar Prabowo 08",
    siteName: "LAPRA 08",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
