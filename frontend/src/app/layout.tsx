import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "JGitLab — Autonomous AI Software Engineering Platform",
  description: "One intelligent platform to build, understand, and evolve AI-powered software.",
  icons: {
    icon: "/jgitlab-mark.png",
    shortcut: "/jgitlab-mark.png",
    apple: "/jgitlab-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0A0D14] text-foreground antialiased selection:bg-[#1F6FEB] selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
