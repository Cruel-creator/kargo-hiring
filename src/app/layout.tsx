import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppShell } from "@/components/shell";
import { ToastProvider } from "@/components/overlay";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kargo Hiring", template: "%s · Kargo Hiring" },
  description: "Review candidates, compare evidence, and prepare interviews.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f7f6f3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
