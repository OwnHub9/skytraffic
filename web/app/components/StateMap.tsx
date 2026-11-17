"use client";
import { useMemo, useState } from "react";
import { STATES, BORDERS, NATION, MAP_W, MAP_H, STATE_NAMES } from "./usmap";
import { heatColor } from "./colors";

export type StateRow = { state: string; flights: number; delay_rate: number; cancel_rate: number; airports: number };
type Metric = "delay_rate" | "cancel_rate" | "flights";
const METRICS: { key: Metric; label: string }[] = [
  { key: "delay_rate", label: "% late" },
  { key: "cancel_rate", label: "% cancelled" },
  { key: "flights", label: "Flights" },
];

export default function StateMap({ rows }: { rows: StateRow[] }) {
  const [metric, setMetric] = useState<Metric>("delay_rate");
  const [hover, setHover] = useState<string | null>(null);

  const byName = useMemo(() => {
    const m = new Map<string, StateRow>();
    rows.forEach((r) => { const n = STATE_NAMES[r.state]; if (n) m.set(n, r); });
    return m;
  }, [rows]);

  const val = (r: StateRow) => (metric === "flights" ? Math.sqrt(r.flights) : r[metric]);
  const vals = STATES.map((s) => byName.get(s.name)).filter(Boolean).map((r) => val(r as StateRow));
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const show = (v: number) => (metric === "flights" ? Math.round(v * v).toLocaleString("en-US") : `${v.toFixed(1)}%`);
  const hs = STATES.find((s) => s.name === hover);
  const hr = hover ? byName.get(hover) : undefined;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {METRICS.map((m) => (
          <button key={m.key} type="button" className="chip" aria-pressed={metric === m.key} onClick={() => setMetric(m.key)}
            style={metric === m.key ? { background: "#E11D48", borderColor: "#E11D48", color: "#fff" } : undefined}>{m.label}</button>
        ))}
      </div>

      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Map of US states coloured by flight delay statistics">
        {STATES.map((s) => {
          const r = byName.get(s.name);
          return (
            <path key={s.id} d={s.d} fill={r ? heatColor(val(r), lo, hi) : "#0b1220"} style={{ cursor: "pointer", transition: "fill .3s" }}
              onMouseEnter={() => setHover(s.name)} onMouseLeave={() => setHover(null)} />
          );
        })}
        <path d={BORDERS} fill="none" stroke="#060a13" strokeWidth={0.9} pointerEvents="none" />
        <path d={NATION} fill="none" stroke="#3a4d6e" strokeWidth={1.2} pointerEvents="none" />
        {hs && <path d={hs.d} fill="none" stroke="#ffffff" strokeWidth={2} pointerEvents="none" />}
      </svg>

      {hs && (
        <div style={{ position: "absolute", left: `${(hs.c[0] / MAP_W) * 100}%`, top: `${((hs.c[1] / MAP_H) * 100)}%`, transform: "translate(-50%, calc(-100% + 30px))", background: "#0d1522", border: "1px solid #2a3548", borderRadius: 12, padding: "10px 14px", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 3 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{hs.name}</div>
          {hr ? (
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, lineHeight: 1.6 }}>
              <span style={{ color: "var(--red)" }}>{hr.delay_rate}% late</span> · {hr.cancel_rate}% cancelled<br />
              {hr.flights.toLocaleString("en-US")} departures · {hr.airports} airport{hr.airports > 1 ? "s" : ""}
            </div>
          ) : <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>No flights in data</div>}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
        {show(lo)} <span style={{ width: 160, height: 8, borderRadius: 4, background: "linear-gradient(90deg, rgb(22,32,50), #FF4D63)" }} /> {show(hi)}
      </div>
    </div>
  );
}