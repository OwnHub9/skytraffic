"use client";
import { useEffect, useRef, useState } from "react";

type Stat = { value: number; label: string; decimals?: number; suffix?: string };

const ARCS = [
  { d: "M80 220 Q420 -20 780 160", color: "#FF4D63", start: 0 },
  { d: "M300 250 Q700 10 1150 170", color: "#FF9F6B", start: 0.12 },
  { d: "M20 180 Q260 60 520 210", color: "#FF4D63", start: 0.24 },
];

function CountUp({ to, decimals = 0, suffix = "", run }: { to: number; decimals?: number; suffix?: string; run: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1600);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

export default function StatsBand({ stats }: { stats: Stat[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [planes, setPlanes] = useState<{ x: number; y: number; a: number; len: number; drawn: number }[]>([]);

  useEffect(() => {
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      setProgress(p);
      if (r.top < vh * 0.85) setVisible(true);
      setPlanes(ARCS.map((arc, i) => {
        const path = pathRefs.current[i];
        if (!path) return { x: 0, y: 0, a: 0, len: 0, drawn: 0 };
        const len = path.getTotalLength();
        const t = Math.min(1, Math.max(0, (p - arc.start) / 0.6));
        const at = Math.max(0.5, t * len);
        const pt = path.getPointAtLength(at);
        const prev = path.getPointAtLength(Math.max(0, at - 1));
        const a = (Math.atan2(pt.y - prev.y, pt.x - prev.x) * 180) / Math.PI;
        return { x: pt.x, y: pt.y, a, len, drawn: t };
      }));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section ref={sectionRef} className="grid-bg" style={{ position: "relative", padding: "70px 0 80px", borderTop: "1px solid #121c2c", borderBottom: "1px solid #121c2c", overflow: "hidden" }}>
      <svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMid slice" aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: `translateY(${(progress - 0.5) * -50}px)` }}>
        {ARCS.map((arc, i) => {
          const pl = planes[i];
          const len = pl?.len || 2000;
          return (
            <g key={i}>
              <path d={arc.d} fill="none" stroke={arc.color} strokeOpacity={0.15} strokeWidth={1} />
              <path ref={(el) => { pathRefs.current[i] = el; }} d={arc.d} fill="none" stroke={arc.color}
                strokeWidth={1.8} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - (pl?.drawn ?? 0))} />
              {pl && pl.drawn > 0 && (
                <g transform={`translate(${pl.x} ${pl.y}) rotate(${pl.a})`}>
                  <circle r="11" fill={arc.color} opacity="0.18" />
                  <path d="M9 0 L-6 -5 L-3 0 L-6 5 Z" fill={arc.color} />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="wrap" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
        {stats.map((s, i) => (
          <div key={s.label} className={`reveal ${visible ? "in" : ""}`}
            style={{ transitionDelay: `${i * 120}ms`, paddingLeft: i ? 24 : 0, borderLeft: i ? "1px solid #2a3548" : "none" }}>
            <div className="display" style={{ fontSize: 44, letterSpacing: -1.5 }}>
              <CountUp to={s.value} decimals={s.decimals} suffix={s.suffix} run={visible} />
            </div>
            <div className="eyebrow" style={{ marginTop: 10, fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}