import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";

const links: { href: string; icon: IconName; label: string; sub: string }[] = [
  { href: "/revision", icon: "revision", label: "Revision", sub: "Spaced-repetition flashcards" },
  { href: "/reports", icon: "reports", label: "Reports", sub: "Your marksheet ledger" },
  { href: "/analytics", icon: "analytics", label: "Analytics", sub: "Readiness & weak-topic map" },
  { href: "/settings", icon: "settings", label: "Settings", sub: "Models, keys & data" },
];

export default function MorePage() {
  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">More</div>
        <h1>The rest of the desk</h1>
      </div>
      <div className="card" style={{ padding: "6px 0", maxWidth: 640 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="exam-row" style={{ gridTemplateColumns: "auto 1fr auto", color: "inherit" }}>
            <span className="nav-ico" style={{ color: "var(--ball)" }}>
              <Icon name={l.icon} size={20} />
            </span>
            <span>
              <span className="name" style={{ fontWeight: 700 }}>{l.label}</span>
              <span className="small muted" style={{ display: "block" }}>{l.sub}</span>
            </span>
            <Icon name="arrow" size={16} className="muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
