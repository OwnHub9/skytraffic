import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import NetworkMap, { type Airport, type Route } from "../components/NetworkMap";
import RhythmChart from "../components/RhythmChart";
import { heatColor } from "../components/colors";
import kpis from "../../public/data/kpis.json";
import airportsJ from "../../public/data/airports.json";
import routesJ from "../../public/data/routes.json";
import hourlyJ from "../../public/data/hourly.json";
import heatJ from "../../public/data/heatmap.json";
import topJ from "../../public/data/top_delayed_airports.json";
import airlinesJ from "../../public/data/airlines.json";
import dailyJ from "../../public/data/daily.json";
import featJ from "../../public/data/feature_importance.json";

type Hour = { dep_hour: number; delay_rate: number; flights: number };
type Heat = { DayOfWeek: number; dep_hour: number; delay_rate: number };
type Airline = { Airline: string; flights: number; delay_rate: number; avg_arr_delay: number };
type Day = { FlightDate: string; flights: number; delay_rate: number; cancel_rate: number };
type Feat = { feature: string; importance: number };

const airports = airportsJ as unknown as Airport[];
const routes = routesJ as unknown as Route[];
const hourly = hourlyJ as unknown as Hour[];
const heat = heatJ as unknown as Heat[];
const top = topJ as unknown as Airport[];
const airlines = airlinesJ as unknown as Airline[];
const daily = dailyJ as unknown as Day[];
const feats = featJ as unknown as Feat[];

const fmt = (n: number) => n.toLocaleString("en-US");
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FEAT_NAMES: Record<string, string> = {
  prev_delay: "Previous-flight delay", Dest_i: "Destination airport", Origin_i: "Origin airport",
  Airline_i: "Airline", dep_hour: "Departure hour", DayOfWeek: "Day of week", Distance: "Distance", is_weekend: "Weekend",
};

function Card({ eyebrow, title, right, children }: { eyebrow: string; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: "24px 24px 22px", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 18 }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 11 }}>{eyebrow}</div>
          <h2 className="display" style={{ margin: "10px 0 0", fontSize: 24, fontWeight: 600 }}>{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, unit, note }: { label: string; value: string; unit?: string; note: string }) {
  return (
    <div className="card" style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}><span>{label}</span><span style={{ color: "var(--muted)" }}>↗</span></div>
      <span className="display" style={{ fontSize: 38, fontWeight: 600, letterSpacing: -1.5 }}>
        {value}{unit && <span style={{ fontSize: 18, color: "var(--muted)" }}> {unit}</span>}
      </span>
      <span style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />{note}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const worstHour = hourly.reduce((a, b) => (b.delay_rate > a.delay_rate ? b : a));
  const worstDay = daily.reduce((a, b) => ((b.delay_rate ?? 0) > (a.delay_rate ?? 0) ? b : a));
  const worstAirport = top[0];
  const bestAirline = [...airlines].sort((a, b) => a.delay_rate - b.delay_rate)[0];
  const topFeat = feats[0];
  const range = `${daily[0].FlightDate} — ${daily[daily.length - 1].FlightDate}`;
  const heatMap = new Map(heat.map((h) => [`${h.DayOfWeek}-${h.dep_hour}`, h.delay_rate]));
  const maxTop = top[0].delay_rate;
  const rankedAirlines = [...airlines].sort((a, b) => b.delay_rate - a.delay_rate);
  const maxAir = rankedAirlines[0].delay_rate;

  const stories = [
    { title: `${String(worstHour.dep_hour).padStart(2, "0")}:00 — worst hour`, text: `${worstHour.delay_rate}% of flights arrive late. Delays build all day.` },
    { title: `${worstAirport.Origin} · ${worstAirport.city}`, text: `Most delayed big airport · ${worstAirport.delay_rate}% late` },
    { title: worstDay.FlightDate, text: `Worst day · ${worstDay.delay_rate}% of flights late` },
    { title: "Late planes stay late", text: `${FEAT_NAMES[topFeat.feature] ?? topFeat.feature} is the #1 predictor (${Math.round(topFeat.importance * 100)}% importance)` },
  ];

  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingTop: 44, paddingBottom: 80, display: "flex", flexDirection: "column", gap: 24 }}>
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div className="eyebrow">Your skies. Decoded.</div>
              <h1 className="display" style={{ margin: "14px 0 0", fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
                Command Center<span style={{ color: "var(--red)" }}>.</span>
              </h1>
              <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 14 }}>A connected view of America&apos;s skies, one departure at a time.</p>
            </div>
            <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>{range} · {fmt(kpis.total_flights)} flights</span>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <Kpi label="Total flights" value={fmt(kpis.total_flights)} note="In selected period" />
            <Kpi label="Delayed 15+ min" value={String(kpis.delay_rate)} unit="%" note="Of completed flights" />
            <Kpi label="Avg delay when late" value={String(kpis.avg_delay_when_late)} unit="min" note="Per delayed flight" />
            <Kpi label="Cancelled" value={String(kpis.cancel_rate)} unit="%" note="Of scheduled flights" />
          </div>
        </Reveal>

        <Reveal>
          <Card eyebrow="Spatial intelligence" title="The network, in motion"
            right={<span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>Hover an airport</span>}>
            <div style={{ margin: "0 -24px", background: "#0a111c", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
              <NetworkMap airports={airports} routes={routes} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 14, marginTop: 16, alignItems: "center" }}>
              <span className="mono" style={{ fontSize: 13, letterSpacing: 2, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />US / ARRIVAL DELAYS · {airports.length} AIRPORTS
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)" }}>
                On time <span style={{ width: 140, height: 6, borderRadius: 3, background: "linear-gradient(90deg, rgb(96,112,138), #FF4D63)" }} /> Late · bubble size = flights
              </span>
            </div>
          </Card>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24 }}>
          <Reveal>
            <Card eyebrow="Hourly pulse" title="Delay rhythm">
              <RhythmChart data={hourly} />
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>% of flights arriving 15+ min late, by scheduled departure hour. Hover the chart.</p>
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card eyebrow="Hour × weekday" title="The weekly landscape">
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 520, display: "flex", flexDirection: "column", gap: 3 }}>
                  {DAYS.map((d, di) => (
                    <div key={d} style={{ display: "grid", gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))", gap: 3, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{d}</span>
                      {Array.from({ length: 24 }, (_, h) => {
                        const v = heatMap.get(`${di + 1}-${h}`);
                        return <div key={h} title={v != null ? `${d} ${h}:00 — ${v}% late` : "No flights"}
                          style={{ height: 26, borderRadius: 4, background: v != null ? heatColor(v) : "#0f1726" }} />;
                      })}
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "36px repeat(4, minmax(0, 1fr))", fontSize: 11, color: "var(--muted)", paddingTop: 6 }}>
                    <span /><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--muted)", marginTop: 14 }}>
                Fewer late <span style={{ width: 120, height: 8, borderRadius: 4, background: "linear-gradient(90deg, rgb(22,32,50), #FF4D63)" }} /> More late
              </div>
            </Card>
          </Reveal>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24 }}>
          <Reveal>
            <Card eyebrow="Where it happens" title="Most delayed airports" right={<span className="eyebrow" style={{ fontSize: 11 }}>% late</span>}>
              {top.map((a, i) => (
                <div key={a.Origin} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto", gap: "8px 12px", alignItems: "center", padding: "12px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <span className="mono" style={{ fontSize: 13, color: "#6f7c90" }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.city} · {a.Origin}</span>
                  <span className="mono" style={{ fontSize: 15 }}>{a.delay_rate}</span>
                  <span />
                  <span style={{ height: 4, borderRadius: 2, background: "var(--red)", width: `${(a.delay_rate / maxTop) * 100}%` }} />
                  <span />
                </div>
              ))}
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0" }}>Airports with 20,000+ departures.</p>
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card eyebrow="Who runs late" title="Airline ranking" right={<span className="eyebrow" style={{ fontSize: 11 }}>% late</span>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rankedAirlines.map((a) => (
                  <div key={a.Airline} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) 52px", gap: 12, alignItems: "center", fontSize: 13 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.Airline}>{a.Airline}</span>
                    <span style={{ height: 8, borderRadius: 4, background: "#1a2333" }}>
                      <span style={{ display: "block", height: 8, borderRadius: 4, width: `${(a.delay_rate / maxAir) * 100}%`, background: a.Airline === bestAirline.Airline ? "var(--green)" : "var(--red)" }} />
                    </span>
                    <span className="mono" style={{ textAlign: "right" }}>{a.delay_rate}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>

        <Reveal>
          <Card eyebrow="Signals worth exploring" title="Data stories">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
              {stories.map((s, i) => (
                <div key={i} style={{ background: i % 2 ? "#141a2e" : "#111b2b", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="eyebrow" style={{ fontSize: 10.5 }}>Insight / {String(i + 1).padStart(2, "0")}</span>
                    <span style={{ color: "var(--muted)" }}>↗</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{s.title}</span>
                  <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>{s.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        <footer style={{ borderTop: "1px solid var(--line)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>SkyTraffic</span>
          <span className="eyebrow" style={{ fontSize: 11 }}>Data: US BTS On-Time Performance · Processed with Apache Spark</span>
        </footer>
      </main>
    </>
  );
}