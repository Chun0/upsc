"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RokkyMascot } from "../three/Mascot";
import Icon, { type IconName } from "../ui/Icon";

type NavItem = { href: string; icon: IconName; label: string };

const NAV_PRIMARY: NavItem[] = [
  { href: "/", icon: "dashboard", label: "Dashboard" },
  { href: "/exams", icon: "exams", label: "Exams" },
  { href: "/study", icon: "study", label: "Study" },
  { href: "/practice", icon: "practice", label: "Practice" },
  { href: "/mocks", icon: "mocks", label: "Mocks" },
  { href: "/descriptive", icon: "descriptive", label: "Descriptive" },
];

const NAV_REVIEW: NavItem[] = [
  { href: "/revision", icon: "revision", label: "Revision" },
  { href: "/reports", icon: "reports", label: "Reports" },
  { href: "/analytics", icon: "analytics", label: "Analytics" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

const QUIPS = [
  "5 questions a day keeps negative marking away.",
  "Eliminate two options, then guess — Rokky's rule.",
  "Mocks before toppers were toppers.",
  "Weak topics today, strong rank tomorrow.",
  "Pattern + practice = rank. Simple maths.",
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

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

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <RokkyMascot size={34} />
          </div>
          <div>
            <div className="brand-name">UDAAN</div>
            <div className="brand-sub">उड़ान · exam copilot</div>
          </div>
        </div>

        <div className="nav-group-label">Prepare</div>
        {NAV_PRIMARY.map((n) => (
          <Link key={n.href} href={n.href} className={`nav-item${isActive(pathname, n.href) ? " active" : ""}`}>
            <span className="nav-ico">
              <Icon name={n.icon} size={18} />
            </span>
            {n.label}
          </Link>
        ))}

        <div className="nav-group-label">Review &amp; tune</div>
        {NAV_REVIEW.map((n) => (
          <Link key={n.href} href={n.href} className={`nav-item${isActive(pathname, n.href) ? " active" : ""}`}>
            <span className="nav-ico">
              <Icon name={n.icon} size={18} />
            </span>
            {n.label}
            {n.href === "/revision" && due > 0 ? <span className="nav-badge">{due}</span> : null}
          </Link>
        ))}

        <div className="sidebar-foot">
          <div className="mascot-mini">
            <RokkyMascot size={34} />
            <div className="bubble">{QUIPS[quip]}</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="eyebrow">UDAAN · Government exam copilot</div>
          <div className="ticker">{today}</div>
          <div className="topbar-right">
            {due > 0 ? (
              <Link href="/revision" className="chip">
                <Icon name="revision" size={14} /> {due} cards due
              </Link>
            ) : null}
            <Link href="/settings" className="chip" title="Profile & settings">
              <Icon name="settings" size={14} /> Settings
            </Link>
          </div>
        </div>
        {children}
      </main>

      <nav className="mobile-nav">
        {NAV_PRIMARY.slice(0, 5).map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link key={n.href} href={n.href} className={`nav-item${active ? " active" : ""}`}>
              <span className="nav-ico">
                <Icon name={n.icon} size={20} />
              </span>
              {n.label.split(" ")[0]}
            </Link>
          );
        })}
        <Link href="/more" className={`nav-item${pathname.startsWith("/more") ? " active" : ""}`}>
          <span className="nav-ico">
            <Icon name="more" size={20} />
          </span>
          More
        </Link>
      </nav>
    </div>
  );
}
