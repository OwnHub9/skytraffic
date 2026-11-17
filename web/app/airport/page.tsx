import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import AirportSearch, { type AirportIdx } from "../components/AirportSearch";
import indexJ from "../../public/data/airport_index.json";
import kpis from "../../public/data/kpis.json";

const airports = indexJ as unknown as AirportIdx[];

export default function Airports() {
  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingTop: 44, paddingBottom: 80, display: "flex", flexDirection: "column", gap: 24 }}>
        <Reveal>
          <div className="eyebrow">Every major hub</div>
          <h1 className="display" style={{ margin: "14px 0 0", fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Airports<span style={{ color: "var(--red)" }}>.</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 14 }}>
            {airports.length} airports with 5,000+ departures. Green = better than the national average ({kpis.delay_rate}% late). Click any airport for its full profile.
          </p>
        </Reveal>
        <Reveal><AirportSearch airports={airports} avg={kpis.delay_rate} /></Reveal>
      </main>
    </>
  );
}