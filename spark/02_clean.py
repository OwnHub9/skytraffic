from pyspark.sql import SparkSession, functions as F

spark = (SparkSession.builder
         .appName("SkyTraffic-Clean")
         .config("spark.driver.memory", "4g")
         .getOrCreate())
spark.sparkContext.setLogLevel("ERROR")

# 1. Read raw CSV
raw = (spark.read.option("header", True)
       .option("inferSchema", True)
       .option("samplingRatio", 0.1)
       .csv("data/raw/Combined_Flights_2022.csv"))
print("Raw rows:", raw.count())

# 2. Keep only the columns we need
keep = ["FlightDate", "Airline", "Origin", "Dest", "OriginCityName",
        "DestCityName", "Cancelled", "Diverted", "CRSDepTime",
        "DepDelay", "ArrDelay", "DepDel15", "ArrDel15", "Distance",
        "AirTime", "TaxiOut", "Month", "DayOfWeek", "Tail_Number"]
df = raw.select([c for c in keep if c in raw.columns])

# 3. Fix types and add new features
df = (df
      .withColumn("FlightDate", F.to_date("FlightDate"))
      .withColumn("Cancelled", F.col("Cancelled").cast("int"))
      .withColumn("Diverted", F.col("Diverted").cast("int"))
      .withColumn("dep_hour", F.floor(F.col("CRSDepTime") / 100).cast("int"))
      .withColumn("route", F.concat_ws("-", "Origin", "Dest"))
      .withColumn("is_weekend", F.col("DayOfWeek").isin(6, 7).cast("int")))

# 4. Remove bad rows
df = (df.dropna(subset=["FlightDate", "Airline", "Origin", "Dest"])
        .filter((F.col("dep_hour") >= 0) & (F.col("dep_hour") <= 23))
        .dropDuplicates())

print("Clean rows:", df.count())

# 5. Save as Parquet, split by month
(df.write.mode("overwrite")
   .partitionBy("Month")
   .parquet("data/processed/flights"))

print("Saved to data/processed/flights  ✅")
df.printSchema()
spark.stop()