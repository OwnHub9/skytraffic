"use client";
import { useState } from "react";

export type AirportRow = { Origin: string; city: string; flights: number; delay_rate: number; avg_dep_delay: number; avg_taxi_out: number; cancel_rate: number; destinations: number };
type Key = "flights" | "destinations" | "delay_rate" | "avg_dep_delay" | "avg_taxi_out" | "cancel_rate";

const ROWS: { key: Key; label: string; unit: string; better: "low" | "high" | null }[] = [
  { key: "flights", label: "Departures", unit: "", better: null },
  { key: "destinations", label: "Destinations served", unit: "", better: "high" },
  { key: "delay_rate", label: "Arrived 15+ min late", unit: "%", better: "low" },
  { key: "avg_dep_delay", label: "Avg departure delay", unit: " min", better: "low" },
  { key: "avg_taxi_out", label: "Avg taxi-out time", unit: " min", better: "low" },
  { key: "cancel_rate", label: "Cancelled", unit: "%", better: "low" },
];
const COLORS = ["#FF4D63", "#7aa2ff"];
const sel = { font: "inherit", fontSize: 15, color: "#f3f6fa", background: "#060a13", borderRadius: 10, padding: "0 12px", minHeight: 46, width: "100%" } as const;

export default function AirportCompare({ airports }: { airports: AirportRow[] }) {
  const [a, setA] = useState(airports[0]?.Origin);
  const [b, setB] = useState(airports[1]?.Origin);
  const pair = [airports.find((x) => x.Origin === a)!, airports.find((x) => x.Origin === b)!];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[a, b].map((v, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor={`cmp-${i}`} style={{ fontSize: 13, color: COLORS[i] }}>Airport {i ? "B" : "A"}</label>
            <select id={`cmp-${i}`} style={{ ...sel, border: `1px solid ${COLORS[i]}66` }} value={v} onChange={(e) => (i ? setB : setA)(e.target.value)}>
              {airports.map((x) => <option key={x.Origin} value={x.Origin}>{x.Origin} · {x.city}</option>)}
            </select>
          </div>
        ))}
      </div>

      {ROWS.map((r) => {
        const v = pair.map((p) => Number(p[r.key]));
        const max = Math.max(...v) || 1;
        const win = r.better === null || v[0] === v[1] ? -1 : r.better === "low" ? (v[0] < v[1] ? 0 : 1) : (v[0] > v[1] ? 0 : 1);
        return (
          <div key={r.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{r.label}</span>
            {v.map((x, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr) 96px", gap: 10, alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 13, color: COLORS[i] }}>{pair[i].Origin}</span>
                <span style={{ height: 10, borderRadius: 5, background: "#1a2333" }}>
                  <span style={{ display: "block", height: 10, borderRadius: 5, width: `${(x / max) * 100}%`, background: COLORS[i], transition: "width .4s" }} />
                </span>
                <span className="mono" style={{ fontSize: 13, textAlign: "right", color: win === i ? "var(--green)" : undefined }}>
                  {x.toLocaleString("en-US")}{r.unit}{win === i ? " ✓" : ""}
                </span>
              </div>
            ))}
          </div>
        );
      })}
      <span style={{ fontSize: 12, color: "var(--muted)" }}>✓ = better of the two. Airports with 5,000+ departures.</span>
    </div>
  );
}