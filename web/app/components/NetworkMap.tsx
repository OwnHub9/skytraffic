"use client";
import { useMemo, useState } from "react";
import { STATES, BORDERS, NATION, MAP_W as W, MAP_H as H, project } from "./usmap";
import { bubbleColor } from "./colors";

export type Airport = { Origin: string; city: string; name: string; flights: number; delay_rate: number; avg_dep_delay: number; lat: number; lon: number };
export type Route = { Origin: string; Dest: string; flights: number; delay_rate: number; lat_o: number; lon_o: number; lat_d: number; lon_d: number };
type PA = Airport & { p: [number, number] };

export default function NetworkMap({ airports, routes }: { airports: Airport[]; routes: Route[] }) {
  const [hover, setHover] = useState<PA | null>(null);
  const [flows, setFlows] = useState(true);

  const ap = useMemo(() => airports.map((a) => ({ ...a, p: project(a.lon, a.lat) }))
    .filter((a): a is PA => a.p !== null).sort((a, b) => b.flights - a.flights), [airports]);
  const rt = useMemo(() => routes.map((r) => ({ ...r, a: project(r.lon_o, r.lat_o), b: project(r.lon_d, r.lat_d) }))
    .filter((r) => r.a && r.b).slice(0, 160) as (Route & { a: [number, number]; b: [number, number] })[], [routes]);

  const maxF = ap[0]?.flights ?? 1, maxR = rt[0]?.flights ?? 1;
  const labels = new Set(ap.slice(0, 12).map((a) => a.Origin));
  const rad = (f: number) => Math.max(2.5, Math.sqrt(f / maxF) * 20);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 14, left: 14, zIndex: 2 }}>
        <button type="button" className="chip" onClick={() => setFlows((f) => !f)}>{flows ? "Flows on" : "Flows off"}</button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="US map with airports coloured by delay rate and the busiest routes">
        {STATES.map((s) => <path key={s.id} d={s.d} className="state" fill="#0f1a2b" />)}
        <path d={BORDERS} fill="none" stroke="#243450" strokeWidth={0.8} pointerEvents="none" />
        <path d={NATION} fill="none" stroke="#3a4d6e" strokeWidth={1.3} pointerEvents="none" />
        <g fill="none" strokeLinecap="round" pointerEvents="none">
          {rt.map((r, i) => {
            const [x1, y1] = r.a, [x2, y2] = r.b, d = Math.hypot(x2 - x1, y2 - y1);
            return <path key={i} d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - d * 0.25} ${x2} ${y2}`} className={flows ? "flow" : ""}
              stroke={bubbleColor(r.delay_rate)} strokeOpacity={0.6} strokeWidth={Math.max(0.6, (r.flights / maxR) * 2.4)} />;
          })}
        </g>
        {ap.map((a) => (
          <circle key={a.Origin} cx={a.p[0]} cy={a.p[1]} r={rad(a.flights)} fill={bubbleColor(a.delay_rate)} fillOpacity={0.88}
            stroke={hover?.Origin === a.Origin ? "#fff" : "#060a13"} strokeWidth={hover?.Origin === a.Origin ? 2 : 0.8}
            style={{ cursor: "pointer" }} onMouseEnter={() => setHover(a)} onMouseLeave={() => setHover(null)} />
        ))}
        <g fontFamily="var(--font-mono), monospace" fontSize="13" fill="#e6eaf0" pointerEvents="none">
          {ap.filter((a) => labels.has(a.Origin)).map((a) => (
            <text key={a.Origin} x={a.p[0] + rad(a.flights) + 4} y={a.p[1] + 4} stroke="#060a13" strokeWidth={3} paintOrder="stroke">{a.Origin}</text>
          ))}
        </g>
      </svg>
      {hover && (
        <div style={{ position: "absolute", left: `${(hover.p[0] / W) * 100}%`, top: `${(hover.p[1] / H) * 100}%`, transform: "translate(-50%, calc(-100% - 18px))", background: "#0d1522", border: "1px solid #2a3548", borderRadius: 12, padding: "10px 14px", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 3 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{hover.Origin} · {hover.city}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            <span style={{ color: "var(--red)" }}>{hover.delay_rate}% late</span> · {hover.flights.toLocaleString("en-US")} flights · avg dep delay {hover.avg_dep_delay} min
          </div>
        </div>
      )}
    </div>
  );
}