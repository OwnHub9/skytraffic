"use client";
import { useState } from "react";

type Hour = { dep_hour: number; delay_rate: number; flights: number };

export default function RhythmChart({ data }: { data: Hour[] }) {
  const [hover, setHover] = useState<Hour | null>(null);
  const W = 640, H = 240, L = 44, R = 14, T = 14, B = 30;
  const rows = [...data].sort((a, b) => a.dep_hour - b.dep_hour);
  const max = Math.ceil(Math.max(...rows.map((d) => d.delay_rate)) / 10) * 10;
  const x = (h: number) => L + (h / 23) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = rows.map((d, i) => `${i ? "L" : "M"}${x(d.dep_hour)} ${y(d.delay_rate)}`).join(" ");
  const area = `${line} L${x(rows[rows.length - 1].dep_hour)} ${y(0)} L${x(rows[0].dep_hour)} ${y(0)} Z`;
  const peak = rows.reduce((a, b) => (b.delay_rate > a.delay_rate ? b : a));
  const show = hover ?? peak;
  const ticks = Array.from({ length: max / 10 + 1 }, (_, i) => i * 10);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <span className="display" style={{ fontSize: 56, fontWeight: 500, letterSpacing: -2 }}>{String(show.dep_hour).padStart(2, "0")}:00</span>
        <span style={{ color: "var(--muted)", fontSize: 15 }}>
          <span style={{ color: "var(--red)" }}>{show.delay_rate}% late</span> · {show.flights.toLocaleString("en-US")} flights{hover ? "" : " · worst hour"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginTop: 8 }} onMouseLeave={() => setHover(null)} role="img" aria-label="Share of flights arriving late by departure hour">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#1c2638" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#9aa6b8">{t}%</text>
          </g>
        ))}
        <path d={area} fill="#FF4D63" fillOpacity={0.12} />
        <path d={line} fill="none" stroke="#FF4D63" strokeWidth={2.5} strokeLinejoin="round" />
        <line x1={x(show.dep_hour)} x2={x(show.dep_hour)} y1={T} y2={y(0)} stroke="#FF4D63" strokeOpacity={0.4} strokeDasharray="3 4" />
        <circle cx={x(show.dep_hour)} cy={y(show.delay_rate)} r={5} fill="#FF4D63" />
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={x(h)} y={H - 8} textAnchor="middle" fontSize="11" fill="#9aa6b8">{String(h).padStart(2, "0")}:00</text>
        ))}
        {rows.map((d) => (
          <rect key={d.dep_hour} x={x(d.dep_hour) - 12} y={T} width={24} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(d)} />
        ))}
      </svg>
    </div>
  );
}