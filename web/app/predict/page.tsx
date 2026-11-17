import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import PredictTool, { type RouteInfo } from "../components/PredictTool";
import metricsJ from "../../public/data/model_metrics.json";
import cmJ from "../../public/data/confusion_matrix.json";
import featJ from "../../public/data/feature_importance.json";
import routesJ from "../../public/data/predict_routes.json";

type Result = { model: string; roc_auc: number; pr_auc: number; accuracy: number; precision: number; recall: number; f1: number; train_seconds: number };
type Metrics = { results: Result[]; best: string; baseline_accuracy: number; train_rows: number; test_rows: number };
type Cell = { label: number; prediction: number; count: number };
type Feat = { feature: string; importance: number };

const metrics = metricsJ as unknown as Metrics;
const cm = cmJ as unknown as Cell[];
const feats = featJ as unknown as Feat[];
const routes = routesJ as unknown as RouteInfo[];

const fmt = (n: number) => n.toLocaleString("en-US");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const FEAT_NAMES: Record<string, string> = {
  prev_delay: "Previous-flight delay", Dest_i: "Destination airport", Origin_i: "Origin airport",
  Airline_i: "Airline", dep_hour: "Departure hour", DayOfWeek: "Day of week", Distance: "Distance", is_weekend: "Weekend",
};

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

function Kpi({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, borderColor: accent ? "#5c1e2e" : undefined }}>
      <span style={{ fontSize: 15 }}>{label}</span>
      <span className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: -1, color: accent ? "var(--red)" : undefined }}>{value}</span>
      <span style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />{note}
      </span>
    </div>
  );
}

const two = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: 24 } as const;

export default function Predict() {
  const ranked = [...metrics.results].sort((a, b) => b.roc_auc - a.roc_auc);
  const best = ranked[0];
  const basePR = 1 - metrics.baseline_accuracy;
  const c = (l: number, p: number) => cm.find((x) => x.label === l && x.prediction === p)?.count ?? 0;
  const tn = c(0, 0), fp = c(0, 1), fn = c(1, 0), tp = c(1, 1);
  const total = tn + fp + fn + tp;
  const maxImp = feats[0]?.importance ?? 1;

  const cells = [
    { title: "Correctly on time", sub: "True negative", v: tn, good: true },
    { title: "False alarm", sub: "False positive", v: fp, good: false },
    { title: "Missed delay", sub: "False negative", v: fn, good: false },
    { title: "Caught delay", sub: "True positive", v: tp, good: true },
  ];

  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingTop: 44, paddingBottom: 80, display: "flex", flexDirection: "column", gap: 24 }}>
        <Reveal>
          <div className="eyebrow">Ahead of the next departure</div>
          <h1 className="display" style={{ margin: "14px 0 0", fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Predictive Intelligence<span style={{ color: "var(--red)" }}>.</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 14 }}>Delay forecasts from Spark MLlib, trained on Jan–May 2022 and tested on unseen Jun–Jul flights.</p>
        </Reveal>

        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <Kpi label="Best model" value={best.model.replace("Gradient-Boosted Trees", "GBT")} note={`of ${metrics.results.length} models compared`} accent />
            <Kpi label="ROC-AUC" value={best.roc_auc.toFixed(3)} note="Random guess = 0.500" />
            <Kpi label="PR-AUC" value={best.pr_auc.toFixed(3)} note={`${(best.pr_auc / basePR).toFixed(1)}× better than guessing (${basePR.toFixed(2)})`} />
            <Kpi label="Test flights" value={fmt(metrics.test_rows)} note={`Trained on ${fmt(metrics.train_rows)} flights`} />
          </div>
        </Reveal>

        <Reveal>
          <Card eyebrow="Try the model" title="Predict my flight"
            foot="Scores come from the trained Random Forest. It was trained with balanced class weights, so read the score as relative risk (higher = more likely late), not an exact probability. The historical rate shows what really happened.">
            <PredictTool routes={routes} />
          </Card>
        </Reveal>

        <Reveal>
          <Card eyebrow="Held-out evaluation" title="Model comparison"
            foot={`Baseline: always predicting "on time" scores ${pct(metrics.baseline_accuracy)} accuracy but catches zero delays. That's why ROC-AUC and PR-AUC matter more than accuracy.`}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
                <thead>
                  <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                    {["Model", "ROC-AUC", "PR-AUC", "Accuracy", "Precision", "Recall", "F1", "Train time"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r) => {
                    const top = r.model === best.model;
                    return (
                      <tr key={r.model} style={{ background: top ? "#1a0f17" : undefined }}>
                        <td style={{ padding: "12px", borderBottom: "1px solid var(--line)", fontWeight: 600, color: top ? "var(--red)" : undefined }}>{r.model}{top ? " ★" : ""}</td>
                        <td style={{ padding: "12px", borderBottom: "1px solid var(--line)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="mono">{r.roc_auc.toFixed(3)}</span>
                            <span style={{ width: 80, height: 6, borderRadius: 3, background: "#1a2333" }}>
                              <span style={{ display: "block", height: 6, borderRadius: 3, width: `${((r.roc_auc - 0.5) / 0.5) * 100}%`, background: top ? "var(--red)" : "#60708a" }} />
                            </span>
                          </div>
                        </td>
                        {[r.pr_auc.toFixed(3), pct(r.accuracy), pct(r.precision), pct(r.recall), r.f1.toFixed(3), `${r.train_seconds}s`].map((v, i) => (
                          <td key={i} className="mono" style={{ padding: "12px", borderBottom: "1px solid var(--line)" }}>{v}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </Reveal>

        <div style={two}>
          <Reveal>
            <Card eyebrow={`${best.model} · test set`} title="Confusion matrix"
              foot={`Of ${fmt(fn + tp)} flights that were really late, the model caught ${fmt(tp)} (${pct(tp / (fn + tp))} recall). When it predicts a delay, it is right ${pct(tp / (tp + fp))} of the time (precision).`}>
              <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 8, alignItems: "stretch" }}>
                <span />
                <span style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>Predicted on time</span>
                <span style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>Predicted late</span>
                {[0, 1].map((row) => (
                  <div key={row} style={{ display: "contents" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>{row ? "Actually late" : "Actually on time"}</span>
                    {cells.slice(row * 2, row * 2 + 2).map((cell) => (
                      <div key={cell.sub} style={{ borderRadius: 12, padding: "16px 14px", background: cell.good ? `rgba(52,211,153,${0.08 + (cell.v / total) * 0.5})` : `rgba(255,77,99,${0.08 + (cell.v / total) * 0.9})`, border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 4 }}>
                        <span className="display" style={{ fontSize: 26, fontWeight: 600 }}>{fmt(cell.v)}</span>
                        <span style={{ fontSize: 13 }}>{cell.title}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{cell.sub} · {pct(cell.v / total)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={120}>
            <Card eyebrow="What drives the prediction" title="Feature importance"
              foot="From the Gradient-Boosted Trees model. The delay of the same plane's previous flight is the strongest signal: delays travel with the aircraft.">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {feats.map((f, i) => (
                  <div key={f.feature} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.5fr) 48px", gap: 12, alignItems: "center", fontSize: 14 }}>
                    <span>{FEAT_NAMES[f.feature] ?? f.feature}</span>
                    <span style={{ height: 10, borderRadius: 5, background: "#1a2333" }}>
                      <span style={{ display: "block", height: 10, borderRadius: 5, width: `${(f.importance / maxImp) * 100}%`, background: i === 0 ? "var(--red)" : "#a8283f" }} />
                    </span>
                    <span className="mono" style={{ textAlign: "right" }}>{(f.importance * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>

        <Reveal>
          <Card eyebrow="Under the hood" title="How the model works">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {[
                ["01 / Target", "Will the flight arrive 15+ minutes late? (ArrDel15 = 1)"],
                ["02 / Features", "Hour, weekday, weekend, distance, airline, origin, destination, and the previous-flight delay of the same aircraft"],
                ["03 / No leakage", "Only information known before departure is used. The flight's own departure delay is excluded."],
                ["04 / Honest split", "Train on Jan–May, test on Jun–Jul: the model is judged on future flights it never saw"],
                ["05 / Imbalance", "Only about 1 in 5 flights is late, so late flights get more weight during training"],
                ["06 / Spark MLlib", "StringIndexer → OneHotEncoder → VectorAssembler → classifier, in one Pipeline"],
              ].map(([t, d], i) => (
                <div key={t} style={{ background: i % 2 ? "#141a2e" : "#111b2b", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="eyebrow" style={{ fontSize: 10.5 }}>{t}</span>
                  <span style={{ fontSize: 14, color: "#c5cedb", lineHeight: 1.5 }}>{d}</span>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        <footer style={{ borderTop: "1px solid var(--line)", paddingTop: 22, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>SkyTraffic · Predictive Intelligence</span>
          <span className="eyebrow" style={{ fontSize: 11 }}>Apache Spark MLlib · Random Forest · GBT · Logistic Regression</span>
        </footer>
      </main>
    </>
  );
}