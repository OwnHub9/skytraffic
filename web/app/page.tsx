import Link from "next/link";
import kpis from "../public/data/kpis.json";
import StatsBand from "./components/StatsBand";
import Reveal from "./components/Reveal";
import Parallax from "./components/Parallax";

const fmt = (n: number) => n.toLocaleString("en-US");

const features = [
  {
    no: "01 / Process",
    title: "Millions of flights. One clear picture.",
    text: "Apache Spark cleans and aggregates official BTS on-time records into a fast Parquet data lake.",
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FF4D63" strokeWidth="1.8" strokeLinecap="round"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>
    ),
  },
  {
    no: "02 / Explore",
    title: "Watch delays spread.",
    text: "Airport delay bubbles, busiest route arcs, and the hours and hubs where delays build up.",
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FF4D63" strokeWidth="1.8" strokeLinecap="round"><circle cx="5" cy="17" r="2" /><circle cx="19" cy="7" r="2" /><circle cx="17" cy="19" r="2" /><path d="M7 16C10 9 14 7 17 7" /><path d="M7 17.5c3 .8 6 1.3 8 1.3" /></svg>
    ),
  },
  {
    no: "03 / Anticipate",
    title: "Know before you fly.",
    text: "Random Forest, Gradient-Boosted Trees and Logistic Regression, tested on unseen future flights.",
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FF4D63" strokeWidth="1.8" strokeLinecap="round"><path d="M4 8V6a2 2 0 0 1 2-2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M20 16v2a2 2 0 0 1-2 2h-2" /><path d="M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></svg>
    ),
  },
];

export default function Home() {
  return (
    <main style={{ overflow: "hidden" }}>
      <header className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 24, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, border: "1px solid #4a1c26", background: "#26101a", display: "grid", placeItems: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4D63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>
          </div>
          <span className="display" style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.5 }}>skytraffic</span>
        </div>
        <Link href="/dashboard" className="btn-ghost" style={{ padding: "10px 16px", gap: 10 }}>Launch ↗</Link>
      </header>

      <section className="wrap" style={{ paddingTop: 110, paddingBottom: 60 }}>
        <Parallax speed={0.3}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)" }} />
            <span className="eyebrow" style={{ color: "#c5cedb" }}>Big data intelligence platform</span>
          </div>
          <h1 className="display" style={{ fontSize: "clamp(52px, 9vw, 120px)", lineHeight: 1.0, fontWeight: 600, letterSpacing: "-0.04em", margin: 0 }}>
            Flights Delay.<br />Data Reveals<br /><span style={{ color: "var(--red)" }}>Why.</span>
          </h1>
          <p style={{ maxWidth: 620, fontSize: 19, lineHeight: 1.6, color: "var(--muted)", marginTop: 32 }}>
            Explore {fmt(kpis.total_flights)} US flight records through network maps,
            delay analytics, and predictive intelligence — processed with Apache Spark.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 36 }}>
            <Link href="/dashboard" className="btn-red">Enter Intelligence Dashboard <span style={{ fontSize: 20 }}>↗</span></Link>
            <a href="#features" className="btn-ghost">Explore the Data <span>↓</span></a>
          </div>
        </Parallax>
      </section>

      <StatsBand
        stats={[
          { value: kpis.total_flights, label: "Validated flights" },
          { value: kpis.airports, label: "US airports" },
          { value: kpis.airlines, label: "Airlines" },
          { value: kpis.delay_rate, label: "Arrived 15+ min late", decimals: 2, suffix: "%" },
        ]}
      />

      <section id="features" className="wrap" style={{ padding: "90px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
        {features.map((f, i) => (
          <Reveal key={f.no} delay={i * 150}>
            <Link href="/dashboard" className="card feature" style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 18, textDecoration: "none", color: "inherit", height: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {f.icon}
                <span style={{ color: "var(--muted)", fontSize: 20 }}>↗</span>
              </div>
              <span className="eyebrow">{f.no}</span>
              <h2 className="display" style={{ margin: 0, fontSize: 30, fontWeight: 500, lineHeight: 1.25 }}>{f.title}</h2>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "var(--muted)" }}>{f.text}</p>
            </Link>
          </Reveal>
        ))}
      </section>

      <footer className="wrap" style={{ borderTop: "1px solid var(--line)", padding: "28px 24px 40px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className="eyebrow" style={{ fontSize: 11 }}>SkyTraffic · Apache Spark · MLlib · Next.js</span>
        <span className="eyebrow" style={{ fontSize: 11 }}>Data: US BTS On-Time Performance, Jan–Jul 2022</span>
      </footer>
    </main>
  );
}