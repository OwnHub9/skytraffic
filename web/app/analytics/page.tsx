import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import { Bars, Trend, type BarDatum } from "../components/Charts";
import { heatColor } from "../components/colors";
import monthlyJ from "../../public/data/monthly.json";
import weekdayJ from "../../public/data/weekday.json";
import histJ from "../../public/data/delay_hist.json";
import distJ from "../../public/data/distance.json";
import taxiJ from "../../public/data/taxi_out.json";
import propJ from "../../public/data/propagation.json";
import dailyJ from "../../public/data/daily.json";
import airMonthJ from "../../public/data/airline_month.json";
import airlinesJ from "../../public/data/airlines.json";

type Monthly = { Month: number; flights: number; delay_rate: number; cancel_rate: number; avg_arr_delay: number };
type Weekday = { DayOfWeek: number; flights: number; delay_rate: number; cancel_rate: number; flights_per_day: number };
type Bin = { bin: number; count?: number; flights?: number; delay_rate?: number; avg_air_time?: number };
type Prop = { ord: number; bucket: string; flights: number; delay_rate: number };
type Day = { FlightDate: string; delay_rate: number };
type AirMonth = { Airline: string; Month: number; delay_rate: number };
type Airline = { Airline: string; delay_rate: number };

const monthly = monthlyJ as unknown as Monthly[];
const weekday = weekdayJ as unknown as Weekday[];
const hist = histJ as unknown as Bin[];
const dist = distJ as unknown as Bin[];
const taxi = taxiJ as unknown as Bin[];
const prop = propJ as unknown as Prop[];
const daily = (dailyJ as unknown as Day[]).filter((d) => d.delay_rate != null);
const airMonth = airMonthJ as unknown as AirMonth[];
const airlines = airlinesJ as unknown as Airline[];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PROP_SHORT = ["1st flight", "On time", "1–14", "15–29", "30–59", "60–119", "120+"];
const fmt = (n: number) => n.toLocaleString("en-US");
const GREY = "#60708a";

function Card({ eyebrow, title, children, foot }: { eyebrow: string; title: string; children: React.ReactNode; foot?: string }) {
  return (
    <section className="card" style={{ padding: "24px 24px 22px", height: "100%", boxSizing: "border-box" }}>
      <div className="eyebrow" style={{ fontSize: 11 }}>{eyebrow}</div>
      <h2 className="display" style={{ margin: "10px 0 16px", fontSize: 22, fontWeight: 600 }}>{title}</h2>
      {children}
      {foot && <p style={{ fontSize: 13, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.5 }}>{foot}</p>}
    </section>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 15 }}>{label}</span>
      <span className="display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>{value}</span>
      <span style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />{note}
      </span>
    </div>
  );
}

const two = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: 24 } as const;

export default function Analytics() {
  // KPIs
  const worstMonth = monthly.reduce((a, b) => (b.delay_rate > a.delay_rate ? b : a));
  const bestDay = weekday.reduce((a, b) => (b.delay_rate < a.delay_rate ? b : a));
  const total = hist.reduce((s, b) => s + (b.count ?? 0), 0);
  const early = hist.filter((b) => b.bin < 0).reduce((s, b) => s + (b.count ?? 0), 0);
  const severe = hist.filter((b) => b.bin >= 60).reduce((s, b) => s + (b.count ?? 0), 0);

  // Chart data
  const monthBars: BarDatum[] = monthly.map((m) => ({
    label: MONTHS[m.Month - 1], value: m.delay_rate,
    note: `${fmt(m.flights)} flights · ${m.cancel_rate}% cancelled`,
  }));
  const dayBars: BarDatum[] = weekday.map((d) => ({
    label: DAYS[d.DayOfWeek - 1], value: d.delay_rate,
    note: `${fmt(d.flights_per_day)} flights per day`,
    color: d.DayOfWeek >= 6 ? "#FF9F6B" : undefined,
  }));
  const histBars: BarDatum[] = hist.map((b, i) => ({
    label: i === 0 ? "≤-60" : i === hist.length - 1 ? "300+" : String(b.bin),
    value: b.count ?? 0,
    note: b.bin < 0 ? `${Math.abs(b.bin)}–${Math.abs(b.bin) - 14} min early` : `${b.bin}–${b.bin + 14} min late`,
    color: b.bin >= 15 ? "#FF4D63" : GREY,
  }));
  const distBars: BarDatum[] = dist.map((b) => ({
    label: String(b.bin), value: b.delay_rate ?? 0,
    note: `${b.bin}–${b.bin + 249} miles · ${fmt(b.flights ?? 0)} flights · ${b.avg_air_time} min in air`,
  }));
  const taxiBars: BarDatum[] = taxi.map((b) => ({
    label: String(b.bin), value: b.delay_rate ?? 0,
    note: `${b.bin}–${b.bin + 4} min taxi-out · ${fmt(b.flights ?? 0)} flights`,
  }));
  const propBars: BarDatum[] = prop.map((p) => ({
    label: PROP_SHORT[p.ord] ?? p.bucket, value: p.delay_rate,
    note: `${p.bucket} · ${fmt(p.flights)} flights`,
    color: p.ord <= 1 ? GREY : undefined,
  }));

  const onTimeRate = prop.find((p) => p.ord === 1)?.delay_rate ?? 0;
  const worstProp = prop.reduce((a, b) => (b.delay_rate > a.delay_rate ? b : a));
  const months = [...new Set(airMonth.map((r) => r.Month))].sort((a, b) => a - b);
  const grid = new Map(airMonth.map((r) => [`${r.Airline}|${r.Month}`, r.delay_rate]));
  const rankedAirlines = [...airlines].sort((a, b) => b.delay_rate - a.delay_rate);

  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingTop: 44, paddingBottom: 80, display: "flex", flexDirection: "column", gap: 24 }}>
        <Reveal>
          <div className="eyebrow">Patterns in time and distance</div>
          <h1 className="display" style={{ margin: "14px 0 0", fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Delay Analytics<span style={{ color: "var(--red)" }}>.</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 14 }}>When, why and how much US flights run late, from {fmt(total)} completed flights.</p>
        </Reveal>

        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <Kpi label="Worst month" value={MONTHS[worstMonth.Month - 1]} note={`${worstMonth.delay_rate}% of flights late`} />
            <Kpi label="Best day to fly" value={DAYS[bestDay.DayOfWeek - 1]} note={`${bestDay.delay_rate}% of flights late`} />
            <Kpi label="Arrived early" value={`${((early / total) * 100).toFixed(1)}%`} note="Landed before schedule" />
            <Kpi label="Severe delays" value={`${((severe / total) * 100).toFixed(1)}%`} note="60+ minutes late" />
          </div>
        </Reveal>

        <Reveal>
          <Card eyebrow="Day by day" title="Daily delay trend" foot="Share of flights arriving 15+ min late each day. The thick line is the 7-day moving average. Hover to see any day.">
            <Trend data={daily.map((d) => ({ x: d.FlightDate, y: d.delay_rate }))} />
          </Card>
        </Reveal>

        <div style={two}>
          <Reveal><Card eyebrow="Seasonality" title="Delays by month" foot="Hover a bar to see flights and cancellations."><Bars data={monthBars} /></Card></Reveal>
          <Reveal delay={120}><Card eyebrow="Weekly rhythm" title="Delays by day of week" foot="Orange bars are weekends."><Bars data={dayBars} /></Card></Reveal>
        </div>

        <Reveal>
          <Card eyebrow="The shape of lateness" title="Arrival delay distribution"
            foot="Number of flights by arrival delay, in 15-minute bins. Grey = early or under 15 min late (counted as on time). Red = officially late.">
            <Bars data={histBars} unit="count" labelEvery={4} height={260} />
          </Card>
        </Reveal>

        <div style={two}>
          <Reveal><Card eyebrow="Distance" title="Does flight length matter?" foot="% late by flight distance (miles). Longer flights can make up time in the air."><Bars data={distBars} labelEvery={2} /></Card></Reveal>
          <Reveal delay={120}><Card eyebrow="Ground congestion" title="Taxi-out time vs delay" foot="% late by minutes spent taxiing before take-off. Long taxi-out signals a congested airport."><Bars data={taxiBars} labelEvery={2} /></Card></Reveal>
        </div>

        <Reveal>
          <Card eyebrow="Delay propagation" title="Late planes stay late"
            foot={`If the same aircraft's previous flight arrived on time, only ${onTimeRate}% of its next flights are late. After a ${worstProp.bucket.replace(" late", "")} delay, ${worstProp.delay_rate}% are late. Delays travel with the aircraft.`}>
            <Bars data={propBars} />
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>X-axis: how late the same plane&apos;s previous flight arrived (minutes).</p>
          </Card>
        </Reveal>

        <Reveal>
          <Card eyebrow="Airline × month" title="Who struggled, and when" foot="% of each airline's flights arriving 15+ min late, by month. Airlines sorted from most to least delayed.">
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 560, display: "grid", gridTemplateColumns: `minmax(180px, 1.4fr) repeat(${months.length}, minmax(52px, 1fr))`, gap: 4, alignItems: "center" }}>
                <span />
                {months.map((m) => <span key={m} style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>{MONTHS[m - 1]}</span>)}
                {rankedAirlines.map((a) => (
                  <div key={a.Airline} style={{ display: "contents" }}>
                    <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.Airline}>{a.Airline}</span>
                    {months.map((m) => {
                      const v = grid.get(`${a.Airline}|${m}`);
                      return (
                        <span key={m} title={v != null ? `${a.Airline} · ${MONTHS[m - 1]}: ${v}% late` : "No flights"}
                          style={{ height: 30, borderRadius: 5, background: v != null ? heatColor(v, 10, 45) : "#0f1726", display: "grid", placeItems: "center", fontSize: 11, color: "#f3f6fa" }}>
                          {v != null ? Math.round(v) : ""}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Reveal>

        <footer style={{ borderTop: "1px solid var(--line)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>SkyTraffic · Delay Analytics</span>
          <span className="eyebrow" style={{ fontSize: 11 }}>Data: US BTS On-Time Performance, Jan–Jul 2022</span>
        </footer>
      </main>
    </>
  );
}