from pyspark.sql import SparkSession, functions as F, Window
from pyspark.ml import PipelineModel
from pyspark.ml.functions import vector_to_array
import json, os, time, glob
import pyspark

spark = (SparkSession.builder.appName("SkyTraffic-Insights")
         .config("spark.driver.memory", "4g")
         .config("spark.sql.shuffle.partitions", "32")
         .getOrCreate())
spark.sparkContext.setLogLevel("ERROR")

OUT = "data/agg"
os.makedirs(OUT, exist_ok=True)

def save(obj, name):
    with open(f"{OUT}/{name}.json", "w") as fh:
        json.dump(obj, fh, indent=1, default=str)
    print(f"  saved {name}.json")

def rows(df):
    return [r.asDict() for r in df.collect()]

pct = lambda c: F.round(F.avg(c) * 100, 2)

print("\n===== SKYTRAFFIC: EXTRA INSIGHTS =====")
f = spark.read.parquet("data/processed/flights").cache()
done = f.filter("Cancelled = 0 AND Diverted = 0")

# 1. Monthly trend
save(rows(f.groupBy("Month").agg(
    F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate"),
    pct("Cancelled").alias("cancel_rate"), F.round(F.avg("ArrDelay"), 1).alias("avg_arr_delay"))
    .orderBy("Month")), "monthly")

# 2. Weekday profile (1 = Monday ... 7 = Sunday)
save(rows(f.groupBy("DayOfWeek").agg(
    F.count("*").alias("flights"), F.countDistinct("FlightDate").alias("days"),
    pct("ArrDel15").alias("delay_rate"), pct("Cancelled").alias("cancel_rate"))
    .withColumn("flights_per_day", F.round(F.col("flights") / F.col("days")))
    .orderBy("DayOfWeek")), "weekday")

# 3. Arrival delay distribution (15-min bins, -60 to 300)
b = F.least(F.greatest(F.floor(F.col("ArrDelay") / 15) * 15, F.lit(-60)), F.lit(300))
save(rows(done.withColumn("bin", b).groupBy("bin").count().orderBy("bin")), "delay_hist")

# 4. Distance vs delay (250-mile bins)
b = F.least(F.floor(F.col("Distance") / 250) * 250, F.lit(3000))
save(rows(done.withColumn("bin", b).groupBy("bin").agg(
    F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate"),
    F.round(F.avg("AirTime"), 1).alias("avg_air_time")).orderBy("bin")), "distance")

# 5. Taxi-out congestion (5-min bins)
b = F.least(F.floor(F.col("TaxiOut") / 5) * 5, F.lit(60))
save(rows(done.filter(F.col("TaxiOut").isNotNull()).withColumn("bin", b).groupBy("bin").agg(
    F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate")).orderBy("bin")), "taxi_out")

# 6. Delay propagation: same plane's previous flight
w = Window.partitionBy("Tail_Number", "FlightDate").orderBy("CRSDepTime")
pr = done.filter(F.col("Tail_Number").isNotNull()).withColumn("prev", F.lag("ArrDelay").over(w))
p = F.col("prev")
bucket = (F.when(p.isNull(), "First flight of day").when(p <= 0, "Previous on time")
          .when(p < 15, "1–14 min late").when(p < 30, "15–29 min late")
          .when(p < 60, "30–59 min late").when(p < 120, "60–119 min late").otherwise("120+ min late"))
order = (F.when(p.isNull(), 0).when(p <= 0, 1).when(p < 15, 2).when(p < 30, 3)
         .when(p < 60, 4).when(p < 120, 5).otherwise(6))
save(rows(pr.withColumn("bucket", bucket).withColumn("ord", order)
          .groupBy("ord", "bucket").agg(F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate"))
          .orderBy("ord")), "propagation")

# 7. State-level stats (state code from "Chicago, IL")
state = F.trim(F.element_at(F.split("OriginCityName", ","), -1))
save(rows(f.withColumn("state", state).groupBy("state").agg(
    F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate"),
    pct("Cancelled").alias("cancel_rate"), F.countDistinct("Origin").alias("airports"))
    .orderBy(F.desc("flights"))), "states")

# 8. Airport comparison table (5,000+ flights)
save(rows(f.groupBy("Origin").agg(
    F.first("OriginCityName").alias("city"), F.count("*").alias("flights"),
    pct("ArrDel15").alias("delay_rate"), F.round(F.avg("DepDelay"), 1).alias("avg_dep_delay"),
    F.round(F.avg("TaxiOut"), 1).alias("avg_taxi_out"), pct("Cancelled").alias("cancel_rate"),
    F.countDistinct("Dest").alias("destinations"))
    .filter("flights >= 5000").orderBy(F.desc("flights"))), "airport_compare")

# 9. Most delayed busy routes
save(rows(done.groupBy("Origin", "Dest").agg(
    F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate"),
    F.round(F.avg("ArrDelay"), 1).alias("avg_arr_delay"), F.round(F.avg("Distance")).alias("distance"))
    .filter("flights >= 1500").orderBy(F.desc("delay_rate")).limit(15)), "delayed_routes")

# 10. Airline details
save(rows(f.groupBy("Airline").agg(
    F.count("*").alias("flights"), pct("ArrDel15").alias("delay_rate"),
    pct("Cancelled").alias("cancel_rate"), pct("Diverted").alias("divert_rate"),
    F.round(F.avg("DepDelay"), 1).alias("avg_dep_delay"), F.round(F.avg("TaxiOut"), 1).alias("avg_taxi_out"),
    F.countDistinct("Origin").alias("airports_served")).orderBy(F.desc("flights"))), "airline_stats")

# 11. Airline x Month grid
save(rows(done.groupBy("Airline", "Month").agg(pct("ArrDel15").alias("delay_rate"))
          .orderBy("Airline", "Month")), "airline_month")

# 12. Spark Processing Lab stats: CSV vs Parquet
print("Running CSV vs Parquet speed test...")
csv_path = "data/raw/Combined_Flights_2022.csv"
pq_files = glob.glob("data/processed/flights/**/*.parquet", recursive=True)
month_sizes = {}
for pth in pq_files:
    m = os.path.basename(os.path.dirname(pth)).replace("Month=", "")
    month_sizes[m] = month_sizes.get(m, 0) + os.path.getsize(pth)
t0 = time.time(); raw_rows = spark.read.option("header", True).csv(csv_path).count(); csv_s = time.time() - t0
t0 = time.time(); spark.read.parquet("data/processed/flights").count(); pq_s = time.time() - t0
t0 = time.time(); spark.read.parquet("data/processed/flights").groupBy("Origin").count().collect(); agg_s = time.time() - t0
csv_mb = os.path.getsize(csv_path) / 1e6
pq_mb = sum(month_sizes.values()) / 1e6
save({
    "spark_version": pyspark.__version__, "cores": spark.sparkContext.defaultParallelism,
    "raw_rows": raw_rows, "clean_rows": f.count(), "raw_columns": 61, "kept_columns": len(f.columns),
    "csv_mb": round(csv_mb, 1), "parquet_mb": round(pq_mb, 1), "compression": round(csv_mb / pq_mb, 1),
    "parquet_files": len(pq_files),
    "month_sizes_mb": {k: round(v / 1e6, 1) for k, v in sorted(month_sizes.items(), key=lambda x: int(x[0]))},
    "csv_count_s": round(csv_s, 2), "parquet_count_s": round(pq_s, 2), "speedup": round(csv_s / pq_s, 1),
    "groupby_s": round(agg_s, 2), "partitions": f.rdd.getNumPartitions(),
}, "spark_lab")

# 13. "Predict my flight" grid using the trained model
print("Scoring prediction grid with the trained model...")
model = PipelineModel.load("models/best_model")
top_routes = (done.groupBy("Origin", "Dest").agg(F.count("*").alias("n"), F.avg("Distance").alias("dist"))
              .orderBy(F.desc("n")).limit(40))
route_air = (done.join(top_routes.select("Origin", "Dest"), ["Origin", "Dest"])
             .groupBy("Origin", "Dest", "Airline").agg(F.count("*").alias("n2")).filter("n2 >= 300")
             .join(top_routes.select("Origin", "Dest", "dist"), ["Origin", "Dest"]))
hours = spark.range(5, 24).select(F.col("id").cast("int").alias("dep_hour"))
scen = spark.createDataFrame([(3, 0, 0.0), (3, 0, 45.0), (6, 1, 0.0), (6, 1, 45.0)],
                             ["DayOfWeek", "is_weekend", "prev_delay"])
grid = (route_air.crossJoin(hours).crossJoin(scen)
        .withColumn("Distance", F.col("dist"))
        .withColumn("DayOfWeek", F.col("DayOfWeek").cast("int"))
        .withColumn("is_weekend", F.col("is_weekend").cast("int")))
pred = model.transform(grid).withColumn("p", F.round(vector_to_array("probability")[1] * 100, 1))
hist = (done.join(route_air.select("Origin", "Dest", "Airline"), ["Origin", "Dest", "Airline"])
        .groupBy("Origin", "Dest", "Airline", "dep_hour")
        .agg(pct("ArrDel15").alias("hist"), F.count("*").alias("hn")))
out = (pred.join(hist, ["Origin", "Dest", "Airline", "dep_hour"], "left")
       .select(F.concat_ws("-", "Origin", "Dest").alias("r"), F.col("Airline").alias("a"),
               F.col("dep_hour").alias("h"), F.col("is_weekend").alias("w"),
               (F.col("prev_delay") > 0).cast("int").alias("l"), "p",
               F.when(F.col("hn") >= 20, F.col("hist")).alias("hist")))
save(rows(out), "predict_grid")
save(rows(top_routes.join(done.select("Origin", "OriginCityName").distinct(), "Origin")
          .join(done.select("Dest", "DestCityName").distinct(), "Dest")
          .select(F.concat_ws("-", "Origin", "Dest").alias("r"), "Origin", "Dest",
                  F.col("OriginCityName").alias("from_city"), F.col("DestCityName").alias("to_city"),
                  F.round("dist").alias("distance"), F.col("n").alias("flights"))
          .orderBy(F.desc("flights")).dropDuplicates(["r"])), "predict_routes")

print("\nDone! 13 new insight files created.")
spark.stop()