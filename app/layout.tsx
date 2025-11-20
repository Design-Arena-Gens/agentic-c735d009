export const metadata = {
  title: "Faceless Affiliate Video Maker",
  description: "Create faceless affiliate videos in your browser"
};

import "./globals.css";
import React from "react";

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">
              Faceless Affiliate Video Maker
            </h1>
            <a
              href="https://agentic-c735d009.vercel.app"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Live
            </a>
          </header>
          {children}
          <footer className="mt-12 border-t pt-6 text-center text-xs text-gray-500">
            Built for fast, faceless content creation.
          </footer>
        </div>
      </body>
    </html>
  );
}
