"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export type AirportIdx = { Origin: string; city: string; name: string; flights: number; delay_rate: number; rank: number };
type Sort = "busy" | "late" | "punctual";

export default function AirportSearch({ airports, avg }: { airports: AirportIdx[]; avg: number }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("busy");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const f = airports.filter((a) => !s || a.Origin.toLowerCase().includes(s) || a.city.toLowerCase().includes(s) || a.name.toLowerCase().includes(s));
    return [...f].sort((a, b) => sort === "busy" ? b.flights - a.flights : sort === "late" ? b.delay_rate - a.delay_rate : a.delay_rate - b.delay_rate);
  }, [airports, q, sort]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label htmlFor="ap-q" style={{ position: "absolute", left: -9999 }}>Search airports</label>
        <input id="ap-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code, city or name (e.g. ATL, Chicago)"
          style={{ flex: "1 1 320px", font: "inherit", fontSize: 15, color: "#f3f6fa", background: "#060a13", border: "1px solid #2a3548", borderRadius: 12, padding: "0 16px", minHeight: 48 }} />
        {([["busy", "Busiest"], ["late", "Most delayed"], ["punctual", "Most punctual"]] as [Sort, string][]).map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={sort === k} onClick={() => setSort(k)}
            style={sort === k ? { background: "#E11D48", borderColor: "#E11D48", color: "#fff" } : undefined}>{l}</button>
        ))}
      </div>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{list.length} airports</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {list.map((a) => (
          <Link key={a.Origin} href={`/airport/${a.Origin}`} className="card feature"
            style={{ padding: "16px 16px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="display" style={{ fontSize: 26, fontWeight: 600 }}>{a.Origin}</span>
              <span className="mono" style={{ fontSize: 13, color: a.delay_rate > avg ? "var(--red)" : "var(--green)" }}>{a.delay_rate}% late</span>
            </div>
            <span style={{ fontSize: 14 }}>{a.city}</span>
            <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{a.flights.toLocaleString("en-US")} departures · #{a.rank} most delayed</span>
          </Link>
        ))}
      </div>
    </div>
  );
}