from pyspark.sql import SparkSession, functions as F, Window
from pyspark.ml import Pipeline
from pyspark.ml.feature import StringIndexer, OneHotEncoder, VectorAssembler
from pyspark.ml.classification import (LogisticRegression,
                                       RandomForestClassifier, GBTClassifier)
from pyspark.ml.evaluation import (BinaryClassificationEvaluator,
                                   MulticlassClassificationEvaluator)
import json, os, time

spark = (SparkSession.builder.appName("SkyTraffic-ML")
         .config("spark.driver.memory", "4g")
         .config("spark.sql.shuffle.partitions", "32")
         .getOrCreate())
spark.sparkContext.setLogLevel("ERROR")
os.makedirs("data/agg", exist_ok=True)

print("\n===== SKYTRAFFIC: ML MODEL =====")

# 1. Load completed flights
df = (spark.read.parquet("data/processed/flights")
      .filter("Cancelled = 0 AND Diverted = 0")
      .filter(F.col("ArrDel15").isNotNull()))

# 2. Feature: delay of the SAME plane's previous flight that day
w = Window.partitionBy("Tail_Number", "FlightDate").orderBy("CRSDepTime")
df = df.withColumn("prev_delay",
                   F.coalesce(F.lag("ArrDelay").over(w), F.lit(0.0)))

data = df.select(F.col("ArrDel15").cast("double").alias("label"),
                 "Month", "DayOfWeek", "dep_hour", "is_weekend",
                 "Distance", "Airline", "Origin", "Dest", "prev_delay").dropna()

# 3. Time-based split: train Jan-May, test Jun-Jul (20% sample for laptop speed)
train = data.filter("Month <= 5").sample(0.2, seed=42)
test = data.filter("Month >= 6").sample(0.2, seed=42)

pos = train.filter("label = 1").count() / train.count()
train = train.withColumn("w", F.when(F.col("label") == 1, 1 - pos)
                         .otherwise(pos)).cache()
test = test.cache()
n_train, n_test = train.count(), test.count()
print(f"Train rows: {n_train:,}  |  Test rows: {n_test:,}")
print(f"Late flights in training data: {pos*100:.1f}%")

# 4. Feature pipelines
cats = ["Airline", "Origin", "Dest"]
idx = [StringIndexer(inputCol=c, outputCol=c + "_i", handleInvalid="keep")
       for c in cats]

ohe = OneHotEncoder(inputCols=["Airline_i", "Origin_i", "Dest_i",
                               "dep_hour", "DayOfWeek"],
                    outputCols=["air_v", "org_v", "dst_v", "hr_v", "dow_v"],
                    handleInvalid="keep")
lr_vec = VectorAssembler(inputCols=["air_v", "org_v", "dst_v", "hr_v", "dow_v",
                                    "is_weekend", "Distance", "prev_delay"],
                         outputCol="features")

tree_feats = ["dep_hour", "DayOfWeek", "is_weekend", "Distance",
              "prev_delay", "Airline_i", "Origin_i", "Dest_i"]
tree_vec = VectorAssembler(inputCols=tree_feats, outputCol="features")

models = {
    "Logistic Regression": Pipeline(stages=idx + [ohe, lr_vec,
        LogisticRegression(weightCol="w", maxIter=30, regParam=0.01)]),
    "Random Forest": Pipeline(stages=idx + [tree_vec,
        RandomForestClassifier(weightCol="w", numTrees=40, maxDepth=10,
                               maxBins=512, seed=42)]),
    "Gradient-Boosted Trees": Pipeline(stages=idx + [tree_vec,
        GBTClassifier(weightCol="w", maxIter=40, maxDepth=6,
                      maxBins=512, seed=42)]),
}

# 5. Train and evaluate
roc = BinaryClassificationEvaluator(metricName="areaUnderROC")
prc = BinaryClassificationEvaluator(metricName="areaUnderPR")
mc = MulticlassClassificationEvaluator(metricLabel=1.0)

results, fitted = [], {}
for name, pipe in models.items():
    print(f"\nTraining {name} ...")
    t0 = time.time()
    model = pipe.fit(train)
    pred = model.transform(test).cache()
    r = {
        "model": name,
        "roc_auc": round(roc.evaluate(pred), 4),
        "pr_auc": round(prc.evaluate(pred), 4),
        "accuracy": round(mc.evaluate(pred, {mc.metricName: "accuracy"}), 4),
        "precision": round(mc.evaluate(pred, {mc.metricName: "precisionByLabel"}), 4),
        "recall": round(mc.evaluate(pred, {mc.metricName: "recallByLabel"}), 4),
        "f1": round(mc.evaluate(pred, {mc.metricName: "fMeasureByLabel"}), 4),
        "train_seconds": round(time.time() - t0, 1),
    }
    print("  ", r)
    results.append(r)
    fitted[name] = (model, pred)

# 6. Baselines for comparison
test_pos = test.filter("label = 1").count() / n_test
print(f"\nBaseline 'always on time' accuracy: {(1-test_pos)*100:.1f}%")
print("Baseline random-guess ROC-AUC     : 0.50")

# 7. Pick best model by ROC-AUC and save
best = max(results, key=lambda r: r["roc_auc"])
best_model, best_pred = fitted[best["model"]]
best_model.write().overwrite().save("models/best_model")
print(f"\nBEST MODEL: {best['model']}  (ROC-AUC {best['roc_auc']})")

# Confusion matrix
cm = (best_pred.groupBy("label", "prediction").count()
      .orderBy("label", "prediction").toPandas())
print("\nConfusion matrix:\n", cm.to_string(index=False))

# Feature importance (from GBT)
gbt = fitted["Gradient-Boosted Trees"][0].stages[-1]
imp = sorted(zip(tree_feats, gbt.featureImportances.toArray()),
             key=lambda x: -x[1])
print("\nFeature importance (GBT):")
for f, v in imp:
    print(f"  {f:12s} {v:.3f}")

# 8. Save results for the website and report
json.dump({"results": results, "best": best["model"],
           "baseline_accuracy": round(1 - test_pos, 4),
           "train_rows": n_train, "test_rows": n_test},
          open("data/agg/model_metrics.json", "w"), indent=1)
json.dump([{"feature": f, "importance": round(float(v), 4)} for f, v in imp],
          open("data/agg/feature_importance.json", "w"), indent=1)
cm.to_json("data/agg/confusion_matrix.json", orient="records", indent=1)
print("\nSaved model_metrics.json, feature_importance.json, confusion_matrix.json")

spark.stop()