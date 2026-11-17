import os, sys, json
os.environ["PYSPARK_PYTHON"] = sys.executable
os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable

from pyspark.sql import SparkSession, functions as F
import pandas as pd

spark = (SparkSession.builder.appName("SkyTraffic-DeepDive")
         .config("spark.driver.memory", "4g")
         .config("spark.sql.shuffle.partitions", "32")
         .getOrCreate())
spark.sparkContext.setLogLevel("ERROR")

OUT = "data/agg"
os.makedirs(f"{OUT}/airports", exist_ok=True)
os.makedirs(f"{OUT}/routes", exist_ok=True)

def recs(pdf):
    return json.loads(pdf.to_json(orient="records"))

def dump(obj, path):
    with open(path, "w") as fh:
        json.dump(obj, fh)

pct = lambda c: F.round(F.avg(c) * 100, 2)

print("\n===== SKYTRAFFIC: DEEP DIVE DATA =====")
f = spark.read.parquet("data/processed/flights").cache()
done = f.filter("Cancelled = 0 AND Diverted = 0").cache()

# Airport names from OpenFlights
ap = pd.read_csv("data/raw/airports.dat", header=None)
names = dict(zip(ap[4], ap[1]))

# ---------- 1. AIRPORT DEEP-DIVE (airports with 5,000+ departures) ----------
print("Building airport pages...")
summ = (f.groupBy("Origin").agg(
            F.first("OriginCityName").alias("city"), F.count("*").alias("flights"),
            pct("Cancelled").alias("cancel_rate"), F.countDistinct("Dest").alias("destinations"),
            F.countDistinct("Airline").alias("n_airlines"),
            F.round(F.avg("DepDelay"), 1).alias("avg_dep_delay"),
            F.round(F.avg("TaxiOut"), 1).alias("avg_taxi_out"))
        .filter("flights >= 5000")
        .join(done.groupBy("Origin").agg(pct("ArrDel15").alias("delay_rate")), "Origin"))
codes = summ.select("Origin")
summ = summ.toPandas()
summ["rank"] = summ["delay_rate"].rank(ascending=False, method="min").astype(int)

big = done.join(F.broadcast(codes), "Origin")
hourly = big.groupBy("Origin", "dep_hour").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).toPandas()
monthly = big.groupBy("Origin", "Month").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).toPandas()
airl = big.groupBy("Origin", "Airline").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).toPandas()
rts = big.groupBy("Origin", "Dest").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate"),
                                        F.round(F.avg("ArrDelay"), 1).alias("avg_arr_delay")).toPandas()

gh, gm = dict(list(hourly.groupby("Origin"))), dict(list(monthly.groupby("Origin")))
ga, gr = dict(list(airl.groupby("Origin"))), dict(list(rts.groupby("Origin")))

index = []
for s in recs(summ):
    c = s["Origin"]
    s["name"] = names.get(c, c)
    s["n_ranked"] = len(summ)
    s["hourly"] = recs(gh[c].sort_values("dep_hour")[["dep_hour", "flights", "delay_rate"]])
    s["monthly"] = recs(gm[c].sort_values("Month")[["Month", "flights", "delay_rate"]])
    s["airlines"] = recs(ga[c].sort_values("flights", ascending=False).head(10)[["Airline", "flights", "delay_rate"]])
    s["routes"] = recs(gr[c].sort_values("flights", ascending=False).head(12)[["Dest", "flights", "delay_rate", "avg_arr_delay"]])
    dump(s, f"{OUT}/airports/{c}.json")
    index.append({k: s[k] for k in ["Origin", "city", "name", "flights", "delay_rate", "rank"]})
dump(sorted(index, key=lambda x: -x["flights"]), f"{OUT}/airport_index.json")
print(f"  saved {len(index)} airport files")

# ---------- 2. AIRLINE SCORECARDS ----------
print("Building airline scorecards...")
ah = done.groupBy("Airline", "dep_hour").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).toPandas()
dump(recs(ah.sort_values(["Airline", "dep_hour"])), f"{OUT}/airline_hours.json")
hubs = done.groupBy("Airline", "Origin").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).toPandas()
hubs = hubs.sort_values("flights", ascending=False).groupby("Airline").head(5)
dump(recs(hubs.sort_values(["Airline", "flights"], ascending=[True, False])), f"{OUT}/airline_hubs.json")
print("  saved airline_hours.json, airline_hubs.json")

# ---------- 3. ROUTE EXPLORER (routes with 300+ flights) ----------
print("Building route files...")
rsum = (f.groupBy("Origin", "Dest").agg(
            F.first("OriginCityName").alias("from_city"), F.first("DestCityName").alias("to_city"),
            F.count("*").alias("flights"), pct("Cancelled").alias("cancel_rate"),
            F.round(F.avg("Distance")).alias("distance"), F.countDistinct("Airline").alias("n_airlines"))
        .filter("flights >= 300")
        .join(done.groupBy("Origin", "Dest").agg(pct("ArrDel15").alias("delay_rate"),
                                                 F.round(F.avg("ArrDelay"), 1).alias("avg_arr_delay")), ["Origin", "Dest"]))
rkeys = rsum.select("Origin", "Dest")
rsum = rsum.toPandas()

rd = done.join(F.broadcast(rkeys), ["Origin", "Dest"])
k = ["Origin", "Dest"]
rh = rd.groupBy(*k, "dep_hour").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).toPandas()
ra = rd.groupBy(*k, "Airline").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate"),
                                   F.round(F.avg("ArrDelay"), 1).alias("avg_arr_delay")).toPandas()
rm = rd.groupBy(*k, "Month").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).toPandas()
rw = rd.groupBy(*k, "DayOfWeek").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).toPandas()

g1, g2 = dict(list(rh.groupby(k))), dict(list(ra.groupby(k)))
g3, g4 = dict(list(rm.groupby(k))), dict(list(rw.groupby(k)))

for r in recs(rsum):
    key = (r["Origin"], r["Dest"])
    r["hourly"] = recs(g1[key].sort_values("dep_hour")[["dep_hour", "flights", "delay_rate"]])
    r["airlines"] = recs(g2[key].sort_values("flights", ascending=False)[["Airline", "flights", "delay_rate", "avg_arr_delay"]])
    r["monthly"] = recs(g3[key].sort_values("Month")[["Month", "flights", "delay_rate"]])
    r["weekday"] = recs(g4[key].sort_values("DayOfWeek")[["DayOfWeek", "flights", "delay_rate"]])
    dump(r, f"{OUT}/routes/{r['Origin']}-{r['Dest']}.json")

cols = ["Origin", "Dest", "from_city", "to_city", "flights", "delay_rate", "distance"]
dump(recs(rsum.sort_values("flights", ascending=False)[cols]), f"{OUT}/routes_index.json")
print(f"  saved {len(rsum)} route files")

print("\nDone! Deep-dive data created.")
spark.stop()