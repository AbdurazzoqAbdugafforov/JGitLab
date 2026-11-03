import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "JGitLab — Autonomous AI Software Engineering Platform",
  description: "One intelligent platform to build, understand, and evolve AI-powered software.",
  icons: {
    icon: "/jgitlab-logo.jpg",
    shortcut: "/jgitlab-logo.jpg",
    apple: "/jgitlab-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-charcoal-950 text-foreground antialiased selection:bg-violet-600 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
