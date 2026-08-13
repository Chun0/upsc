import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Shell from "@/components/shell/Shell";
import { ToastProvider } from "@/components/ui/Toast";

// "Paper & Ink" — display serif (gazette / printed paper), humanist body,
// mono for timers & serial numbers. See REVAMP_PLAN.md Phase 2.
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "UDAAN — Government Exam Prep Copilot",
  description:
    "One copilot for every Indian government exam. Pattern-faithful quizzes, mocks and descriptive papers, honest scoring, and a mastery map that lifts you — one bubble at a time.",
};

export const viewport: Viewport = {
  themeColor: "#f4f3ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <ToastProvider>
          <Shell>{children}</Shell>
        </ToastProvider>
      </body>
    </html>
  );
}
