# SkyTraffic ✈️ — Big Data Visualization of US Flight Delays

**Flights Delay. Data Reveals Why.**

SkyTraffic processes **4,078,318 US domestic flights** (Jan–Jul 2022) with **Apache Spark**,
predicts delays with **Spark MLlib**, and presents everything in an interactive, animated
**Next.js** dashboard.

**Course:** 21CSE423T – Big Data Visualization, SRM Institute of Science and Technology
**Student:** Aastu Raghubanshi (RA2211056010032)
**Guide:** Dr. P. Varun

## Key results
- 21.65% of flights arrive 15+ minutes late; 3.02% are cancelled
- Worst hour: 21:00 (31.7% late). Delays build up through the day
- Best model: Random Forest, ROC-AUC 0.77 on unseen future flights
- #1 predictor: the delay of the same aircraft's previous flight (delay propagation)

## Tech stack
PySpark 3.5 · Spark MLlib · Parquet · Python 3.11 · Next.js · d3-geo

## Dashboard pages
Landing · Command Center · Airspace Atlas · Airports · Delay Analytics · Predictive Intelligence · Spark Lab

## How to run
1. Download `Combined_Flights_2022.csv` from Kaggle
   (robikscube/flight-delay-dataset-20182022) into `data/raw/`
2. Download `airports.dat` from OpenFlights into `data/raw/`
3. Install Python 3.11 and Java 17, then:
   ```
   py -3.11 -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. Run the Spark scripts in order:
   ```
   python spark\02_clean.py
   python spark\03_analysis.py
   python spark\04_model.py
   python spark\05_insights.py
   python spark\06_deepdive.py
   ```
5. Copy the results and start the website:
   ```
   Copy-Item data\agg\* web\public\data\ -Recurse -Force
   cd web
   npm install
   npm run dev
   ```
6. Open http://localhost:3000

## Project structure
- `spark/` – PySpark scripts (explore, clean, analysis, model, insights, deep-dive)
- `data/agg/` – processed JSON results
- `web/` – Next.js dashboard