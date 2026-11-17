"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Command Center" },
  {href:  "/geography" , label: "Airspace Atlas" },
  { href: "/airport", label: "Airport" },
  { href: "/analytics", label: "Delay Analytics" },
  { href: "/predict", label: "Predictive Intelligence" },
  { href: "/lab" , label: "Spark Lab" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,10,19,0.85)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", gap: 16, height: 64 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--text)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4D63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>
          <span className="display" style={{ fontSize: 20, fontWeight: 500 }}>skytraffic</span>
        </Link>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto", overflowX: "auto" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="navlink" data-active={path === l.href}>{l.label}</Link>
          ))}
        </div>
        <span className="eyebrow" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />Historical data
        </span>
      </div>
    </nav>
  );
}