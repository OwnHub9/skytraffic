"use client";
import { useMemo, useState } from "react";

export type BarDatum = { label: string; value: number; note?: string; color?: string };

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function niceMax(m: number) {
  if (m <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= m) return k * p;
  return 10 * p;
}

function fmtVal(v: number, unit: string, decimals: number) {
  if (unit === "count") return compact.format(v);
  return `${v.toFixed(decimals)}${unit === "%" ? "%" : ` ${unit}`}`;
}

export function Bars({ data, unit = "%", decimals = 1, height = 240, labelEvery = 1, defaultIndex }: {
  data: BarDatum[]; unit?: string; decimals?: number; height?: number; labelEvery?: number; defaultIndex?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, L = 48, R = 8, T = 12, B = 34;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const slot = (W - L - R) / data.length;
  const bw = Math.max(2, slot * 0.72);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const peak = data.reduce((bi, d, i) => (d.value > data[bi].value ? i : bi), 0);
  const idx = hover ?? defaultIndex ?? peak;
  const cur = data[idx];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * max);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", minHeight: 34 }}>
        <span className="display" style={{ fontSize: 28, fontWeight: 600 }}>{fmtVal(cur.value, unit, decimals)}</span>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>{cur.label}{cur.note ? ` · ${cur.note}` : ""}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginTop: 6 }} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#1c2638" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#9aa6b8">
              {unit === "count" ? compact.format(t) : `${Math.round(t)}${unit === "%" ? "%" : ""}`}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + i * slot + (slot - bw) / 2;
          const on = i === idx;
          return (
            <g key={i}>
              <rect x={x} y={y(d.value)} width={bw} height={Math.max(0, y(0) - y(d.value))} rx={Math.min(4, bw / 3)}
                fill={d.color ?? "#FF4D63"} fillOpacity={on ? 1 : 0.65} />
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontSize="11" fill={on ? "#f3f6fa" : "#9aa6b8"}>{d.label}</text>
              )}
              <rect x={L + i * slot} y={T} width={slot} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Trend({ data, win = 7, height = 260 }: { data: { x: string; y: number }[]; win?: number; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 960, H = height, L = 44, R = 10, T = 14, B = 30;
  const avg = useMemo(() => data.map((_, i) => {
    const s = data.slice(Math.max(0, i - win + 1), i + 1);
    return s.reduce((a, b) => a + b.y, 0) / s.length;
  }), [data, win]);
  const max = niceMax(Math.max(...data.map((d) => d.y)));
  const n = data.length;
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const peak = data.reduce((bi, d, i) => (d.y > data[bi].y ? i : bi), 0);
  const idx = hover ?? peak;
  const slot = (W - L - R) / (n - 1);
  const monthStarts = data.map((d, i) => ({ d, i })).filter((o) => o.d.x.endsWith("-01"));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * max);

  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
        <span className="display" style={{ fontSize: 28, fontWeight: 600 }}>{data[idx].y.toFixed(1)}%</span>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>
          {data[idx].x} · 7-day average {avg[idx].toFixed(1)}%{hover === null ? " · worst day" : ""}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginTop: 6 }} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#1c2638" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#9aa6b8">{Math.round(t)}%</text>
          </g>
        ))}
        {monthStarts.map((o) => (
          <text key={o.i} x={x(o.i)} y={H - 8} fontSize="11" fill="#9aa6b8">{MONTHS[Number(o.d.x.slice(5, 7)) - 1]}</text>
        ))}
        <path d={path(data.map((d) => d.y))} fill="none" stroke="#FF4D63" strokeOpacity={0.35} strokeWidth={1.2} />
        <path d={path(avg)} fill="none" stroke="#FF4D63" strokeWidth={2.6} strokeLinejoin="round" />
        <line x1={x(idx)} x2={x(idx)} y1={T} y2={y(0)} stroke="#FF4D63" strokeOpacity={0.4} strokeDasharray="3 4" />
        <circle cx={x(idx)} cy={y(data[idx].y)} r={4.5} fill="#FF4D63" />
        {data.map((d, i) => (
          <rect key={d.x} x={x(i) - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 2, background: "#FF4D63", opacity: 0.4 }} />Daily</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 3, background: "#FF4D63" }} />7-day average</span>
      </div>
    </div>
  );
}