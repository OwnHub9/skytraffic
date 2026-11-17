import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import StateMap, { type StateRow } from "../components/StateMap";
import AirportCompare, { type AirportRow } from "../components/AirportCompare";
import { STATE_NAMES } from "../components/usmap";
import statesJ from "../../public/data/states.json";
import compareJ from "../../public/data/airport_compare.json";
import routesJ from "../../public/data/delayed_routes.json";

type DRoute = { Origin: string; Dest: string; flights: number; delay_rate: number; avg_arr_delay: number; distance: number };

const states = (statesJ as unknown as StateRow[]).filter((s) => STATE_NAMES[s.state]);
const airports = compareJ as unknown as AirportRow[];
const routes = routesJ as unknown as DRoute[];
const fmt = (n: number) => n.toLocaleString("en-US");

function Card({ eyebrow, title, children, foot }: { eyebrow: string; title: string; children: React.ReactNode; foot?: string }) {
  return (
    <section className="card" style={{ padding: "24px 24px 22px", height: "100%", boxSizing: "border-box" }}>
      <div className="eyebrow" style={{ fontSize: 11 }}>{eyebrow}</div>
      <h2 className="display" style={{ margin: "10px 0 18px", fontSize: 22, fontWeight: 600 }}>{title}</h2>
      {children}
      {foot && <p style={{ fontSize: 13, color: "var(--muted)", margin: "14px 0 0", lineHeight: 1.5 }}>{foot}</p>}
    </section>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 15 }}>{label}</span>
      <span className="display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: -1 }}>{value}</span>
      <span style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />{note}
      </span>
    </div>
  );
}

const two = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: 24 } as const;

export default function Geography() {
  const big = states.filter((s) => s.flights >= 20000);
  const worst = [...big].sort((a, b) => b.delay_rate - a.delay_rate);
  const busiest = [...states].sort((a, b) => b.flights - a.flights)[0];
  const maxRate = worst[0].delay_rate;

  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingTop: 44, paddingBottom: 80, display: "flex", flexDirection: "column", gap: 24 }}>
        <Reveal>
          <div className="eyebrow">Where delays happen</div>
          <h1 className="display" style={{ margin: "14px 0 0", fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Geographic Intelligence<span style={{ color: "var(--red)" }}>.</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 14 }}>Delays across {states.length} states and territories, {fmt(airports.length)} major airports and the busiest routes.</p>
        </Reveal>

        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <Kpi label="Busiest state" value={STATE_NAMES[busiest.state]} note={`${fmt(busiest.flights)} departures`} />
            <Kpi label="Most delayed state" value={STATE_NAMES[worst[0].state]} note={`${worst[0].delay_rate}% of flights late`} />
            <Kpi label="Most punctual state" value={STATE_NAMES[worst[worst.length - 1].state]} note={`${worst[worst.length - 1].delay_rate}% late (20k+ flights)`} />
            <Kpi label="Most delayed route" value={`${routes[0].Origin} → ${routes[0].Dest}`} note={`${routes[0].delay_rate}% late`} />
          </div>
        </Reveal>

        <Reveal>
          <Card eyebrow="State by state" title="The delay map of America" foot="Hover a state for details. Switch between % late, % cancelled and number of departures. Grey states have no flights in the data.">
            <StateMap rows={states} />
          </Card>
        </Reveal>

        <div style={two}>
          <Reveal>
            <Card eyebrow="Ranking" title="States by delay rate" foot="States with 20,000+ departures. Red = above the national average.">
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {worst.map((s, i) => (
                  <div key={s.state} style={{ display: "grid", gridTemplateColumns: "26px minmax(0, 1fr) minmax(0, 1.2fr) 48px", gap: 10, alignItems: "center", fontSize: 13 }}>
                    <span className="mono" style={{ color: "#6f7c90" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{STATE_NAMES[s.state]}</span>
                    <span style={{ height: 8, borderRadius: 4, background: "#1a2333" }}>
                      <span style={{ display: "block", height: 8, borderRadius: 4, width: `${(s.delay_rate / maxRate) * 100}%`, background: s.delay_rate > 21.65 ? "var(--red)" : "#60708a" }} />
                    </span>
                    <span className="mono" style={{ textAlign: "right" }}>{s.delay_rate}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card eyebrow="Head to head" title="Compare two airports">
              <AirportCompare airports={airports} />
            </Card>
          </Reveal>
        </div>

        <Reveal>
          <Card eyebrow="Routes" title="Most delayed busy routes" foot="Routes with at least 1,500 completed flights, ranked by the share arriving 15+ min late.">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 560 }}>
                <thead>
                  <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                    {["#", "Route", "Flights", "% late", "Avg arrival delay", "Distance"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r, i) => (
                    <tr key={`${r.Origin}-${r.Dest}`}>
                      <td className="mono" style={{ padding: 12, borderBottom: "1px solid var(--line)", color: "#6f7c90" }}>{String(i + 1).padStart(2, "0")}</td>
                      <td className="mono" style={{ padding: 12, borderBottom: "1px solid var(--line)", fontWeight: 600 }}>{r.Origin} → {r.Dest}</td>
                      <td className="mono" style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{fmt(r.flights)}</td>
                      <td className="mono" style={{ padding: 12, borderBottom: "1px solid var(--line)", color: "var(--red)" }}>{r.delay_rate}%</td>
                      <td className="mono" style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{r.avg_arr_delay} min</td>
                      <td className="mono" style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{fmt(r.distance)} mi</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Reveal>

        <footer style={{ borderTop: "1px solid var(--line)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>SkyTraffic · Geographic Intelligence</span>
          <span className="eyebrow" style={{ fontSize: 11 }}>Map: US Census boundaries via us-atlas</span>
        </footer>
      </main>
    </>
  );
}