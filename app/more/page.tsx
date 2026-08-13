import Link from "next/link";

export default function MorePage() {
  const links = [
    { href: "/reports", ico: "📊", label: "Reports" },
    { href: "/analytics", ico: "📈", label: "Analytics" },
    { href: "/settings", ico: "⚙️", label: "Settings" },
  ];
  return (
    <div className="grid cols-3">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="card hoverable" style={{ textAlign: "center", padding: "28px 12px" }}>
          <div style={{ fontSize: 34 }}>{l.ico}</div>
          <div className="mt8" style={{ fontWeight: 700 }}>{l.label}</div>
        </Link>
      ))}
    </div>
  );
}
