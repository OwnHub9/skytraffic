from pyspark.sql import SparkSession, functions as F
import pandas as pd, json, os

spark = (SparkSession.builder.appName("SkyTraffic-Analysis")
         .config("spark.driver.memory", "4g").getOrCreate())
spark.sparkContext.setLogLevel("ERROR")

flights = spark.read.parquet("data/processed/flights").cache()
done = flights.filter("Cancelled = 0 AND Diverted = 0")  # completed flights
os.makedirs("data/agg", exist_ok=True)

def save(pdf, name):
    pdf.to_json(f"data/agg/{name}.json", orient="records", indent=1)
    print(f"  saved {name}.json ({len(pdf)} rows)")

# Airport coordinates (for the map)
ap = pd.read_csv("data/raw/airports.dat", header=None)
ap = ap[[1, 2, 4, 6, 7]]
ap.columns = ["name", "city", "iata", "lat", "lon"]

print("\n===== SKYTRAFFIC ANALYSIS =====")

# 1. Headline numbers (KPI cards)
a = flights.agg(F.count("*").alias("total"),
                F.avg("Cancelled").alias("cancel")).first()
b = done.agg(F.avg("ArrDel15").alias("late"),
             F.avg(F.when(F.col("ArrDel15") == 1, F.col("ArrDelay"))).alias("avg_late"),
             F.countDistinct("Origin").alias("airports"),
             F.countDistinct("Airline").alias("airlines")).first()
kpis = {"total_flights": a["total"],
        "cancel_rate": round(a["cancel"] * 100, 2),
        "delay_rate": round(b["late"] * 100, 2),
        "avg_delay_when_late": round(b["avg_late"], 1),
        "airports": b["airports"], "airlines": b["airlines"]}
json.dump(kpis, open("data/agg/kpis.json", "w"), indent=1)
print("KPIs:", kpis)

# 2. Delay rhythm: % late by departure hour
hourly = (done.groupBy("dep_hour")
          .agg(F.round(F.avg("ArrDel15") * 100, 2).alias("delay_rate"),
               F.count("*").alias("flights"))
          .orderBy("dep_hour").toPandas())
save(hourly, "hourly")

# 3. Heatmap: day of week x hour
heat = (done.groupBy("DayOfWeek", "dep_hour")
        .agg(F.round(F.avg("ArrDel15") * 100, 2).alias("delay_rate"))
        .orderBy("DayOfWeek", "dep_hour").toPandas())
save(heat, "heatmap")

# 4. Airports (map bubbles)
airports = (done.groupBy("Origin")
            .agg(F.count("*").alias("flights"),
                 F.round(F.avg("ArrDel15") * 100, 2).alias("delay_rate"),
                 F.round(F.avg("DepDelay"), 1).alias("avg_dep_delay"))
            .filter("flights >= 1000").toPandas()
            .merge(ap, left_on="Origin", right_on="iata"))
save(airports, "airports")

# 5. Most delayed big airports (20k+ flights)
top = (airports[airports.flights >= 20000]
       .sort_values("delay_rate", ascending=False).head(10))
save(top, "top_delayed_airports")

# 6. Airline ranking
airlines = (done.groupBy("Airline")
            .agg(F.count("*").alias("flights"),
                 F.round(F.avg("ArrDel15") * 100, 2).alias("delay_rate"),
                 F.round(F.avg("ArrDelay"), 1).alias("avg_arr_delay"))
            .orderBy(F.desc("delay_rate")).toPandas())
save(airlines, "airlines")

# 7. Busiest routes with coordinates (map arcs)
routes = (done.groupBy("Origin", "Dest")
          .agg(F.count("*").alias("flights"),
               F.round(F.avg("ArrDel15") * 100, 2).alias("delay_rate"))
          .orderBy(F.desc("flights")).limit(300).toPandas())
c = ap[["iata", "lat", "lon"]]
routes = (routes.merge(c, left_on="Origin", right_on="iata")
                .merge(c, left_on="Dest", right_on="iata", suffixes=("_o", "_d")))
save(routes, "routes")

# 8. Daily trend
daily = (flights.groupBy("FlightDate")
         .agg(F.count("*").alias("flights"),
              F.round(F.avg("ArrDel15") * 100, 2).alias("delay_rate"),
              F.round(F.avg("Cancelled") * 100, 2).alias("cancel_rate"))
         .orderBy("FlightDate").toPandas())
daily["FlightDate"] = daily["FlightDate"].astype(str)
save(daily, "daily")

# Key findings for your report
print("\n===== KEY FINDINGS =====")
w = hourly.loc[hourly.delay_rate.idxmax()]
print(f"Worst hour      : {int(w.dep_hour)}:00 ({w.delay_rate}% late)")
print(f"Worst airport   : {top.iloc[0].Origin} ({top.iloc[0].delay_rate}% late)")
print(f"Worst airline   : {airlines.iloc[0].Airline} ({airlines.iloc[0].delay_rate}%)")
print(f"Best airline    : {airlines.iloc[-1].Airline} ({airlines.iloc[-1].delay_rate}%)")
d = daily.loc[daily.delay_rate.idxmax()]
print(f"Worst day       : {d.FlightDate} ({d.delay_rate}% late)")

spark.stop()