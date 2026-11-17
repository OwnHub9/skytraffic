import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import { Bars, type BarDatum } from "../components/Charts";
import labJ from "../../public/data/spark_lab.json";
import kpis from "../../public/data/kpis.json";
import metricsJ from "../../public/data/model_metrics.json";

type Lab = {
  spark_version: string; cores: number; raw_rows: number; clean_rows: number; raw_columns: number; kept_columns: number;
  csv_mb: number; parquet_mb: number; compression: number; parquet_files: number; month_sizes_mb: Record<string, number>;
  csv_count_s: number; parquet_count_s: number; speedup: number; groupby_s: number; partitions: number;
};
const lab = labJ as unknown as Lab;
const metrics = metricsJ as unknown as { train_rows: number; test_rows: number };

const fmt = (n: number) => n.toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
      <span className="display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>{value}</span>
      <span style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />{note}
      </span>
    </div>
  );
}

function Compare({ rows, unit }: { rows: { label: string; value: number; color: string }[]; unit: string }) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
            <span>{r.label}</span><span className="mono">{r.value} {unit}</span>
          </div>
          <div style={{ height: 14, borderRadius: 7, background: "#1a2333" }}>
            <div style={{ height: 14, borderRadius: 7, width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const two = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: 24 } as const;

export default function Lab() {
  const partitions: BarDatum[] = Object.entries(lab.month_sizes_mb).map(([m, mb]) => ({
    label: MONTHS[Number(m) - 1], value: mb, note: `Month=${m} folder`,
  }));

  const steps = [
    { file: "Raw data", title: "BTS CSV", lines: [`${lab.csv_mb.toLocaleString("en-US")} MB`, `${fmt(lab.raw_rows)} rows`, `${lab.raw_columns} columns`] },
    { file: "02_clean.py", title: "Clean → Parquet", lines: [`${lab.kept_columns} columns kept`, "Types fixed, features added", `Partitioned by month`] },
    { file: "03_analysis.py", title: "Aggregate", lines: ["groupBy airport, hour,", "airline, route, day", "7 summary tables"] },
    { file: "04_model.py", title: "Machine learning", lines: ["3 MLlib models", `${fmt(metrics.train_rows)} train rows`, `${fmt(metrics.test_rows)} test rows`] },
    { file: "05_insights.py", title: "Insights", lines: ["Window functions", "Prediction grid", "13 more tables"] },
    { file: "web/", title: "Dashboard", lines: ["Next.js reads", "small JSON files", "No Spark at runtime"] },
  ];

  const concepts = [
    ["Lazy evaluation", "Transformations like filter and groupBy only build a plan. Spark runs it when an action (count, write, collect) is called."],
    ["Partitioning", `Data is written in ${Object.keys(lab.month_sizes_mb).length} Month= folders. A query for one month reads only that folder.`],
    ["Columnar storage", `Parquet stores data by column and compresses it: ${lab.compression}× smaller than the CSV.`],
    ["Caching", "The cleaned DataFrame is cached in memory with .cache() so repeated queries don't re-read disk."],
    ["Window functions", "lag() over each aircraft's day finds the previous flight's delay — the model's #1 feature."],
    ["ML Pipelines", "StringIndexer → OneHotEncoder → VectorAssembler → classifier, trained and saved as one model."],
  ];

  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingTop: 44, paddingBottom: 80, display: "flex", flexDirection: "column", gap: 24 }}>
        <Reveal>
          <div className="eyebrow">How the data was processed</div>
          <h1 className="display" style={{ margin: "14px 0 0", fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Spark Processing Lab<span style={{ color: "var(--red)" }}>.</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 14 }}>From a {lab.csv_mb.toLocaleString("en-US")} MB CSV to a fast, partitioned data lake with Apache Spark {lab.spark_version}.</p>
        </Reveal>

        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <Kpi label="Rows processed" value={fmt(lab.clean_rows)} note={`${fmt(kpis.total_flights)} US flights`} />
            <Kpi label="Storage saved" value={`${lab.compression}×`} note={`${lab.csv_mb} MB → ${lab.parquet_mb} MB`} />
            <Kpi label="Faster reads" value={`${lab.speedup}×`} note="Parquet vs CSV row count" />
            <Kpi label="Spark engine" value={`v${lab.spark_version}`} note={`${lab.cores} cores · local mode`} />
          </div>
        </Reveal>

        <Reveal>
          <Card eyebrow="End-to-end pipeline" title="From raw CSV to dashboard">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}>
              {steps.map((s, i) => (
                <div key={s.file} style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 160px" }}>
                  <div style={{ flex: 1, background: i === steps.length - 1 ? "#1a0f17" : "#111b2b", border: `1px solid ${i === steps.length - 1 ? "#5c1e2e" : "var(--line)"}`, borderRadius: 14, padding: "14px 14px", height: "100%", boxSizing: "border-box" }}>
                    <div className="mono" style={{ fontSize: 11, color: "var(--red)" }}>{s.file}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, margin: "6px 0 8px" }}>{s.title}</div>
                    {s.lines.map((l) => <div key={l} style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{l}</div>)}
                  </div>
                  {i < steps.length - 1 && <span aria-hidden style={{ color: "var(--red)", fontSize: 18 }}>→</span>}
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        <div style={two}>
          <Reveal>
            <Card eyebrow="Storage" title="CSV vs Parquet size" foot={`Parquet's columnar format with compression makes the same ${fmt(lab.clean_rows)} rows ${lab.compression}× smaller, even after keeping only the needed columns.`}>
              <Compare unit="MB" rows={[
                { label: "Raw CSV (61 columns)", value: lab.csv_mb, color: "#60708a" },
                { label: `Parquet (${lab.kept_columns} columns)`, value: lab.parquet_mb, color: "#FF4D63" },
              ]} />
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card eyebrow="Speed test" title="Time to read and count all rows" foot={`Measured on this laptop. Reading Parquet was ${lab.speedup}× faster. A full groupBy over every airport on Parquet took ${lab.groupby_s} s.`}>
              <Compare unit="s" rows={[
                { label: "CSV", value: lab.csv_count_s, color: "#60708a" },
                { label: "Parquet", value: lab.parquet_count_s, color: "#FF4D63" },
              ]} />
            </Card>
          </Reveal>
        </div>

        <div style={two}>
          <Reveal>
            <Card eyebrow="Partitioning" title="Data lake by month" foot={`${lab.parquet_files} Parquet files across ${partitions.length} month partitions. Spark processes partitions in parallel (${lab.partitions} in-memory partitions).`}>
              <Bars data={partitions} unit="MB" />
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card eyebrow="Data quality" title="Cleaning report">
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  ["Raw rows", fmt(lab.raw_rows)],
                  ["Rows after cleaning", fmt(lab.clean_rows)],
                  ["Rows removed", fmt(lab.raw_rows - lab.clean_rows)],
                  ["Columns in raw file", String(lab.raw_columns)],
                  ["Columns kept", String(lab.kept_columns)],
                  ["Cancelled flights", `${kpis.cancel_rate}% (kept, excluded from delay stats)`],
                  ["Late = arrival delay", "15+ minutes (official BTS definition)"],
                ].map(([k, v], i) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderTop: i ? "1px solid var(--line)" : "none", fontSize: 14 }}>
                    <span style={{ color: "var(--muted)" }}>{k}</span><span className="mono" style={{ textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>

        <Reveal>
          <Card eyebrow="Big data concepts used" title="Spark under the hood">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {concepts.map(([t, d], i) => (
                <div key={t} style={{ background: i % 2 ? "#141a2e" : "#111b2b", border: "1px solid var(--line)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="eyebrow" style={{ fontSize: 10.5 }}>{String(i + 1).padStart(2, "0")} / {t}</span>
                  <span style={{ fontSize: 14, color: "#c5cedb", lineHeight: 1.5 }}>{d}</span>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card eyebrow="Core code" title="The cleaning step in PySpark">
            <pre className="mono" style={{ margin: 0, background: "#060a13", border: "1px solid var(--line)", borderRadius: 12, padding: 18, fontSize: 13, lineHeight: 1.6, overflowX: "auto", color: "#c5cedb" }}>
{`raw = spark.read.option("header", True).csv("Combined_Flights_2022.csv")

df = (raw.select(keep)
      .withColumn("dep_hour", F.floor(F.col("CRSDepTime") / 100))
      .withColumn("route", F.concat_ws("-", "Origin", "Dest"))
      .dropna(subset=["FlightDate", "Airline", "Origin", "Dest"])
      .dropDuplicates())

df.write.partitionBy("Month").parquet("data/processed/flights")`}
            </pre>
          </Card>
        </Reveal>

        <footer style={{ borderTop: "1px solid var(--line)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>SkyTraffic · Spark Processing Lab</span>
          <span className="eyebrow" style={{ fontSize: 11 }}>PySpark · Parquet · MLlib</span>
        </footer>
      </main>
    </>
  );
}