"use client";
import { useEffect, useMemo, useState } from "react";

type Row = { r: string; a: string; h: number; w: number; l: number; p: number; hist: number | null };
export type RouteInfo = { r: string; Origin: string; Dest: string; from_city: string; to_city: string; distance: number; flights: number };

const riskOf = (p: number) =>
  p < 40 ? { label: "Low risk", color: "#34d399" } :
  p < 60 ? { label: "Moderate risk", color: "#FF9F6B" } :
  { label: "High risk", color: "#FF4D63" };

const label = { fontSize: 13, color: "var(--muted)" } as const;
const select = { font: "inherit", fontSize: 15, color: "#f3f6fa", background: "#060a13", border: "1px solid #2a3548", borderRadius: 10, padding: "0 12px", minHeight: 46, width: "100%" } as const;

function Toggle({ options, value, onChange }: { options: [string, string]; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", background: "#060a13", border: "1px solid #2a3548", borderRadius: 10, padding: 3 }}>
      {options.map((o, i) => (
        <button key={o} type="button" aria-pressed={value === i} onClick={() => onChange(i)}
          style={{ flex: 1, font: "inherit", fontSize: 14, minHeight: 38, border: 0, borderRadius: 8, cursor: "pointer",
            background: value === i ? "#E11D48" : "transparent", color: value === i ? "#fff" : "#9aa6b8" }}>{o}</button>
      ))}
    </div>
  );
}

export default function PredictTool({ routes }: { routes: RouteInfo[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [route, setRoute] = useState(routes[0]?.r ?? "");
  const [airline, setAirline] = useState("");
  const [hour, setHour] = useState(18);
  const [w, setW] = useState(0);
  const [l, setL] = useState(0);

  useEffect(() => {
    fetch("/data/predict_grid.json").then((r) => r.json()).then(setRows).catch(() => setRows([]));
  }, []);

  const index = useMemo(() => {
    const m = new Map<string, Row>();
    (rows ?? []).forEach((x) => m.set(`${x.r}|${x.a}|${x.h}|${x.w}|${x.l}`, x));
    return m;
  }, [rows]);

  const airlinesFor = useMemo(
    () => [...new Set((rows ?? []).filter((x) => x.r === route).map((x) => x.a))].sort(),
    [rows, route]);

  useEffect(() => {
    if (airlinesFor.length && !airlinesFor.includes(airline)) setAirline(airlinesFor[0]);
  }, [airlinesFor, airline]);

  const get = (h: number, ll = l) => index.get(`${route}|${airline}|${h}|${w}|${ll}`);
  const cur = get(hour);
  const alt = get(hour, 1 - l);
  const hours = Array.from({ length: 19 }, (_, i) => i + 5);
  const info = routes.find((x) => x.r === route);
  const risk = cur ? riskOf(cur.p) : null;

  // risk-by-hour chart
  const CW = 640, CH = 170, L = 34, B = 26, T = 10;
  const slot = (CW - L) / hours.length;
  const y = (v: number) => T + (1 - v / 100) * (CH - T - B);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 24 }}>
      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="pt-route" style={label}>Route (40 busiest)</label>
          <select id="pt-route" style={select} value={route} onChange={(e) => setRoute(e.target.value)}>
            {routes.map((r) => <option key={r.r} value={r.r}>{r.Origin} → {r.Dest} · {r.from_city.split(",")[0]} to {r.to_city.split(",")[0]}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="pt-air" style={label}>Airline</label>
            <select id="pt-air" style={select} value={airline} onChange={(e) => setAirline(e.target.value)}>
              {airlinesFor.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="pt-hour" style={label}>Departure hour</label>
            <select id="pt-hour" style={select} value={hour} onChange={(e) => setHour(Number(e.target.value))}>
              {hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label}>Day</span>
          <Toggle options={["Weekday (Wed)", "Weekend (Sat)"]} value={w} onChange={setW} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label}>Incoming aircraft (its previous flight)</span>
          <Toggle options={["On time", "45 min late"]} value={l} onChange={setL} />
        </div>
        {info && <span style={{ fontSize: 13, color: "var(--muted)" }}>{info.distance.toLocaleString("en-US")} miles · {info.flights.toLocaleString("en-US")} flights on this route in the data</span>}
      </div>

      {/* Result */}
      <div style={{ background: "#060a13", border: `1px solid ${risk ? risk.color + "55" : "#2a3548"}`, borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
        {rows === null && <span style={{ color: "var(--muted)" }}>Loading model predictions…</span>}
        {rows !== null && !cur && <span style={{ color: "var(--muted)" }}>No prediction for this combination.</span>}
        {cur && risk && (
          <>
            <span className="eyebrow" style={{ fontSize: 11 }}>Delay risk score</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <span className="display" style={{ fontSize: 64, fontWeight: 600, letterSpacing: -2, color: risk.color, lineHeight: 1 }}>{cur.p.toFixed(0)}<span style={{ fontSize: 28 }}>%</span></span>
              <span style={{ fontSize: 15, fontWeight: 600, color: risk.color, border: `1px solid ${risk.color}`, borderRadius: 999, padding: "4px 12px" }}>{risk.label}</span>
            </div>
            <span style={{ fontSize: 14, color: "#c5cedb", lineHeight: 1.5 }}>
              {cur.hist != null
                ? <>Historically, <b style={{ color: "#f3f6fa" }}>{cur.hist}%</b> of {airline} flights on this route at {String(hour).padStart(2, "0")}:00 arrived 15+ min late.</>
                : <>Not enough history for this exact hour, so the score comes from the model alone.</>}
            </span>
            {alt && (
              <span style={{ fontSize: 14, color: "#c5cedb" }}>
                {l === 0 ? "If the incoming plane is 45 min late: " : "If the incoming plane were on time: "}
                <b style={{ color: riskOf(alt.p).color }}>{alt.p.toFixed(0)}%</b>
              </span>
            )}
            <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "auto", marginTop: 6 }} role="img" aria-label="Delay risk by departure hour">
              {[0, 50, 100].map((t) => (
                <g key={t}>
                  <line x1={L} x2={CW} y1={y(t)} y2={y(t)} stroke="#1c2638" />
                  <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#9aa6b8">{t}</text>
                </g>
              ))}
              {hours.map((h, i) => {
                const v = get(h)?.p ?? 0;
                const on = h === hour;
                return (
                  <g key={h} style={{ cursor: "pointer" }} onClick={() => setHour(h)}>
                    <rect x={L + i * slot + slot * 0.15} y={y(v)} width={slot * 0.7} height={y(0) - y(v)} rx={3}
                      fill={riskOf(v).color} fillOpacity={on ? 1 : 0.45} />
                    {i % 3 === 0 && <text x={L + i * slot + slot / 2} y={CH - 8} textAnchor="middle" fontSize="11" fill={on ? "#f3f6fa" : "#9aa6b8"}>{String(h).padStart(2, "0")}</text>}
                    <rect x={L + i * slot} y={T} width={slot} height={CH - T - B} fill="transparent" />
                  </g>
                );
              })}
            </svg>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Risk by departure hour. Click a bar to pick that hour.</span>
          </>
        )}
      </div>
    </div>
  );
}