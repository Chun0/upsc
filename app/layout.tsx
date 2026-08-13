import type { Metadata, Viewport } from "next";
import "./globals.css";
import Shell from "@/components/shell/Shell";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "UDAAN — Government Exam Prep Copilot",
  description:
    "AI-powered preparation for UPSC, SSC, Banking, Railways, Defence & State PSC exams. Quizzes, mocks, descriptive scoring, honest analytics — with Rokky as your coach.",
};

export const viewport: Viewport = {
  themeColor: "#060913",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="stars" aria-hidden="true" />
        <div className="stars2" aria-hidden="true" />
        <ToastProvider>
          <Shell>{children}</Shell>
        </ToastProvider>
      </body>
    </html>
  );
}
