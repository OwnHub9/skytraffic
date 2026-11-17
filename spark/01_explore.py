from pyspark.sql import SparkSession

# 1. Start Spark
spark = (SparkSession.builder
         .appName("SkyTraffic-Explore")
         .config("spark.driver.memory", "4g")
         .getOrCreate())
spark.sparkContext.setLogLevel("ERROR")

# 2. Read the 1.4 GB flight file
df = (spark.read
      .option("header", True)
      .option("inferSchema", True)
      .option("samplingRatio", 0.1)
      .csv("data/raw/Combined_Flights_2022.csv"))

# 3. Basic facts
print("\n========== SKYTRAFFIC: FIRST LOOK ==========")
print("Total flights :", df.count())
print("Total columns :", len(df.columns))

# 4. All column names
print("\n--- Column names ---")
for i, c in enumerate(df.columns, 1):
    print(f"{i:2}. {c}")

# 5. First 5 flights
wanted = ["FlightDate", "Airline", "Origin", "Dest",
          "DepDelay", "ArrDelay", "Cancelled"]
cols = [c for c in wanted if c in df.columns]
print("\n--- First 5 flights ---")
df.select(cols).show(5, truncate=False)

spark.stop()