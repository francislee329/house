import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HK Flat Value Finder",
  description: "Find the best value flats in Hong Kong",
};

function Navbar() {
  return (
    <nav className="border-b border-zinc-800 bg-[#0d0d12]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          <span className="text-blue-400">HK</span> Flat Finder
        </Link>
        <div className="flex gap-6 text-sm text-zinc-400">
          <Link href="/" className="hover:text-white transition">屋苑</Link>
          <Link href="/listings" className="hover:text-white transition">放盤</Link>
          <Link href="/ranking" className="hover:text-white transition">筍盤排名</Link>
          <Link href="/compare" className="hover:text-white transition">比較</Link>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-[#0a0a0f] text-zinc-100 antialiased">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
