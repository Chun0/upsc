"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RokkyMascot } from "../three/Mascot";

const NAV = [
  { href: "/", ico: "🚀", label: "Dashboard" },
  { href: "/exams", ico: "🏛️", label: "Exams" },
  { href: "/study", ico: "📚", label: "Study" },
  { href: "/practice", ico: "✍️", label: "Practice" },
  { href: "/mocks", ico: "🎯", label: "Mocks" },
  { href: "/descriptive", ico: "🖋️", label: "Descriptive" },
  { href: "/revision", ico: "🧠", label: "Revision" },
  { href: "/reports", ico: "📊", label: "Reports" },
  { href: "/analytics", ico: "📈", label: "Analytics" },
  { href: "/settings", ico: "⚙️", label: "Settings" },
];

const QUIPS = [
  "5 questions a day keeps negative marking away!",
  "Rokky tip: eliminate 2 options, then guess.",
  "Mocks before toppers were toppers!",
  "Weak topics today, strong rank tomorrow.",
  "Padhai + pattern = rank. Simple maths.",
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [quip, setQuip] = useState(0);
  const [due, setDue] = useState(0);

  useEffect(() => {
    setQuip(Math.floor(Math.random() * QUIPS.length));
    fetch("/api/revision/due")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.due === "number") setDue(d.due);
      })
      .catch(() => undefined);
  }, [pathname]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">🚀</div>
          <div>
            <div className="brand-name grad-text">UDAAN</div>
            <div className="brand-sub">exam copilot</div>
          </div>
        </div>
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={`nav-item${active ? " active" : ""}`}>
              <span className="nav-ico">{n.ico}</span>
              {n.label}
              {n.href === "/revision" && due > 0 ? <span className="nav-badge">{due}</span> : null}
            </Link>
          );
        })}
        <div className="sidebar-foot">
          <div className="mascot-mini">
            <RokkyMascot size={36} />
            <div className="bubble">{QUIPS[quip]}</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="grow">
            <h1 className="grad-text">
              {(() => {
                const item = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));
                return item ? item.label : "UDAAN";
              })()}
            </h1>
            <div className="sub">Your mission control for {new Date().getFullYear()} government exams</div>
          </div>
          <div className="topbar-right">
            <Link href="/settings" className="chip" title="Profile & settings">
              ⚙️ <span className="small">Settings</span>
            </Link>
          </div>
        </div>
        {children}
      </main>

      <nav className="mobile-nav">
        {NAV.slice(0, 6).map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={`nav-item${active ? " active" : ""}`}>
              <span className="nav-ico">{n.ico}</span>
              {n.label.split(" ")[0]}
            </Link>
          );
        })}
        <Link href="/more" className={`nav-item${pathname.startsWith("/more") ? " active" : ""}`}>
          <span className="nav-ico">⋯</span>More
        </Link>
      </nav>
    </div>
  );
}
