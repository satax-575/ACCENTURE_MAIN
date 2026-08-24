"""
Generates illustrative sample data for BusinessIntelligence.ai's KPI Storytelling Engine.

Three heterogeneous sources, on three different refresh cadences, exactly as
described in the Round 2 proposal:
    transactions.csv     - daily      - revenue, purchase frequency, AOV
    marketing.csv         - weekly     - campaign spend
    support_tickets.csv  - irregular  - checkout-error and other ticket events

Two regions are generated:
    East Region  -> Scenario 1 (multi-factor anomaly) and Scenario 4 (personas)
                    Revenue drops ~12% in the week of 2026-08-11, driven mainly
                    by a checkout-error spike and a smaller purchase-frequency dip.
    North Region -> Scenario 2 (abstention)
                    Revenue drops ~7% in the week of 2026-08-18, but marketing
                    data is stale and support data is missing for that window,
                    so the engine must decline to name a cause.

Deterministic (fixed seed) so the pipeline output is reproducible.
"""
import csv
import random
from datetime import date, timedelta

random.seed(42)

START = date(2026, 6, 1)
END = date(2026, 8, 24)          # "today" for the demo
REGIONS = ["East Region", "North Region"]
PRODUCTS = ["Standard Plan", "Pro Plan", "Add-on Pack"]
CHANNELS = ["web", "mobile", "partner"]

ANOMALY_WEEK_EAST = date(2026, 8, 11)   # Mon
ANOMALY_WEEK_NORTH = date(2026, 8, 18)  # Mon


def daterange(start, end):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


# ---------------------------------------------------------------- transactions
def gen_transactions():
    rows = []
    order_id = 1
    for region in REGIONS:
        base_orders_per_day = 42
        base_price = 68.0
        for d in daterange(START, END):
            orders_today = base_orders_per_day + random.randint(-2, 2)

            # --- East Region: checkout errors + softer demand starting Aug 11 ---
            if region == "East Region" and ANOMALY_WEEK_EAST <= d < ANOMALY_WEEK_EAST + timedelta(days=7):
                orders_today = int(orders_today * 0.86)   # purchase frequency down ~8-14%
            # --- North Region: statistically clear drop, but explanation data is missing ---
            if region == "North Region" and ANOMALY_WEEK_NORTH <= d < ANOMALY_WEEK_NORTH + timedelta(days=7):
                orders_today = int(orders_today * 0.82)   # revenue down materially and significantly

            for _ in range(orders_today):
                product = random.choice(PRODUCTS)
                price = base_price * random.uniform(0.9, 1.3)
                qty = random.choice([1, 1, 1, 2])
                channel = random.choice(CHANNELS)
                customer_id = f"C{random.randint(1, 3000):05d}"
                rows.append([order_id, d.isoformat(), region, product, qty,
                             round(price, 2), channel, customer_id])
                order_id += 1
    # --- New Product X: launched 10 days before "today" (END), East Region  ---
    # only. Too little history for the standard trailing-baseline z-score in
    # detect.py (see MIN_HISTORY_DAYS in engine/sparse_history.py), and its
    # early adoption is deliberately ~35% below the cohort benchmark used by
    # that module, so Scenario 3 has something real to detect.
    NEW_PRODUCT_LAUNCH = END - timedelta(days=9)   # 10 days of history through END, inclusive
    for d in daterange(NEW_PRODUCT_LAUNCH, END):
        expected_cohort_orders = 10                 # business-rule benchmark, see sparse_history.py
        actual_orders = max(int(expected_cohort_orders * 0.65) + random.randint(-1, 1), 0)
        for _ in range(actual_orders):
            price = 45.0 * random.uniform(0.9, 1.1)
            channel = random.choice(CHANNELS)
            customer_id = f"C{random.randint(1, 3000):05d}"
            rows.append([order_id, d.isoformat(), "East Region", "New Product X", 1,
                         round(price, 2), channel, customer_id])
            order_id += 1

    with open("transactions.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["order_id", "date", "region", "product", "qty", "price", "channel", "customer_id"])
        w.writerows(rows)
    print(f"transactions.csv: {len(rows)} rows")


# -------------------------------------------------------------------- marketing
def gen_marketing():
    rows = []
    d = START
    while d <= END:
        week_start = d
        for region in REGIONS:
            spend = 9000 + random.randint(-500, 500)
            # East: marketing pulled back starting the anomaly week (a real, smaller contributor)
            if region == "East Region" and week_start >= ANOMALY_WEEK_EAST:
                spend = int(spend * 0.80)
            impressions = int(spend * random.uniform(28, 34))
            clicks = int(impressions * random.uniform(0.02, 0.035))

            # North Region: marketing feed goes STALE - no rows published from
            # the anomaly week onward, simulating a broken/delayed pipeline.
            if region == "North Region" and week_start >= ANOMALY_WEEK_NORTH:
                continue

            rows.append([week_start.isoformat(), region, "Always-on Search", spend, impressions, clicks])
        d += timedelta(days=7)
    with open("marketing.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["week_start", "region", "campaign", "spend", "impressions", "clicks"])
        w.writerows(rows)
    print(f"marketing.csv: {len(rows)} rows")


# ------------------------------------------------------------- support tickets
def gen_support_tickets():
    rows = []
    for region in REGIONS:
        for d in daterange(START, END):
            # North Region: support feed goes missing entirely for the
            # anomaly week (simulating an outage in the ticketing export).
            if region == "North Region" and ANOMALY_WEEK_NORTH <= d < ANOMALY_WEEK_NORTH + timedelta(days=7):
                continue

            base_checkout = 3
            base_other = 6
            # East Region: checkout-error spike starts 2 days BEFORE the
            # revenue shift and runs through the anomaly week (~3x baseline).
            spike_start = ANOMALY_WEEK_EAST - timedelta(days=2)
            spike_end = ANOMALY_WEEK_EAST + timedelta(days=7)
            if region == "East Region" and spike_start <= d < spike_end:
                checkout = base_checkout * random.choice([3, 4])
            else:
                checkout = base_checkout + random.randint(-1, 1)

            other = base_other + random.randint(-2, 2)
            rows.append([d.isoformat(), region, "checkout_error", max(checkout, 0)])
            rows.append([d.isoformat(), region, "other", max(other, 0)])
    with open("support_tickets.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "region", "category", "ticket_count"])
        w.writerows(rows)
    print(f"support_tickets.csv: {len(rows)} rows")


if __name__ == "__main__":
    gen_transactions()
    gen_marketing()
    gen_support_tickets()
    print("Sample data generated in", __file__.rsplit("/", 1)[0])
