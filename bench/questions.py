"""Question templates with gold SQL, and the train/test split.

Questions are generated from templates so that users ask *similar* questions
over time, which is the situation Apprentice is built for. The test set uses
the same templates with different parameters and is never written to memory.
"""

import json
import random
import sqlite3
from pathlib import Path

from apprentice.config import ROOT, settings

from .shopdb import AREAS, PAYMENTS, PRODUCTS, SCHEMA, STORES

QUESTIONS_PATH = ROOT / "data" / "runtime" / "questions.json"

SYSTEM_PROMPT = f"""You are an expert SQLite analyst for a chain of grocery stores in Mumbai.
Write ONE SQLite query that answers the user's question using this schema:

{SCHEMA}

Notes:
- Dates are stored as 'YYYY-MM-DD' text; use strftime('%m', ...) for months.
- Revenue or amount spent = quantity * unit_price from order_items.
- Store names, product names and categories must match exactly.
Reply with only the SQL query inside a ```sql code block."""

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September"]
STORE_NAMES = [name for name, _ in STORES]
CATEGORIES = list(PRODUCTS)
PRODUCT_NAMES = [name for items in PRODUCTS.values() for name, _ in items]

_ITEMS = "order_items oi JOIN orders o ON o.id = oi.order_id"


def _mm(month: str) -> str:
    return f"{MONTHS.index(month) + 1:02d}"


def _templates() -> list[tuple[str, list[dict], str, str]]:
    """(template id, parameter combos, question format, SQL format)."""
    stores = [{"store": s} for s in STORE_NAMES]
    months = [{"month": m, "mm": _mm(m)} for m in MONTHS]
    return [
        ("orders_at_store", stores,
         "How many orders were placed at the {store} store?",
         "SELECT COUNT(*) FROM orders o JOIN stores s ON s.id = o.store_id WHERE s.name = '{store}'"),
        ("revenue_store_month", [{**s, **m} for s in stores for m in months],
         "What was the total revenue of the {store} store in {month} 2026?",
         f"SELECT SUM(oi.quantity * oi.unit_price) FROM {_ITEMS} JOIN stores s ON s.id = o.store_id "
         "WHERE s.name = '{store}' AND strftime('%m', o.order_date) = '{mm}'"),
        ("top_category_month", months,
         "Which product category earned the most revenue in {month} 2026?",
         f"SELECT p.category FROM {_ITEMS} JOIN products p ON p.id = oi.product_id "
         "WHERE strftime('%m', o.order_date) = '{mm}' GROUP BY p.category "
         "ORDER BY SUM(oi.quantity * oi.unit_price) DESC LIMIT 1"),
        ("top_products_store", stores,
         "What are the top 3 products by quantity sold at the {store} store?",
         f"SELECT p.name FROM {_ITEMS} JOIN products p ON p.id = oi.product_id "
         "JOIN stores s ON s.id = o.store_id WHERE s.name = '{store}' "
         "GROUP BY p.id ORDER BY SUM(oi.quantity) DESC LIMIT 3"),
        ("customers_in_area", [{"area": a} for a in AREAS],
         "How many customers live in {area}?",
         "SELECT COUNT(*) FROM customers WHERE area = '{area}'"),
        ("avg_order_value", [{**s, "payment": p} for s in stores for p in PAYMENTS],
         "What is the average order value of orders paid by {payment} at the {store} store?",
         "SELECT AVG(total) FROM (SELECT o.id, SUM(oi.quantity * oi.unit_price) AS total "
         f"FROM {_ITEMS} JOIN stores s ON s.id = o.store_id "
         "WHERE s.name = '{store}' AND o.payment_method = '{payment}' GROUP BY o.id)"),
        ("busiest_store_month", months,
         "Which store had the most orders in {month} 2026?",
         "SELECT s.name FROM orders o JOIN stores s ON s.id = o.store_id "
         "WHERE strftime('%m', o.order_date) = '{mm}' GROUP BY s.id ORDER BY COUNT(*) DESC LIMIT 1"),
        ("orders_payment_store", [{**s, "payment": p} for s in stores for p in PAYMENTS],
         "How many orders at the {store} store were paid by {payment}?",
         "SELECT COUNT(*) FROM orders o JOIN stores s ON s.id = o.store_id "
         "WHERE s.name = '{store}' AND o.payment_method = '{payment}'"),
        ("top_customer_area", [{"area": a} for a in AREAS],
         "Which customer living in {area} has spent the most money in total?",
         f"SELECT c.name FROM {_ITEMS} JOIN customers c ON c.id = o.customer_id "
         "WHERE c.area = '{area}' GROUP BY c.id ORDER BY SUM(oi.quantity * oi.unit_price) DESC LIMIT 1"),
        ("units_of_product", [{"product": p} for p in PRODUCT_NAMES],
         "How many units of {product} have been sold in total?",
         "SELECT SUM(oi.quantity) FROM order_items oi JOIN products p ON p.id = oi.product_id "
         "WHERE p.name = '{product}'"),
        ("customers_category_month", [{"category": c, **m} for c in CATEGORIES for m in months],
         "How many different customers bought {category} products in {month} 2026?",
         f"SELECT COUNT(DISTINCT o.customer_id) FROM {_ITEMS} JOIN products p ON p.id = oi.product_id "
         "WHERE p.category = '{category}' AND strftime('%m', o.order_date) = '{mm}'"),
        ("best_month_store", stores,
         "In which month of 2026 (as a month number) did the {store} store make the most revenue?",
         f"SELECT strftime('%m', o.order_date) FROM {_ITEMS} JOIN stores s ON s.id = o.store_id "
         "WHERE s.name = '{store}' GROUP BY 1 ORDER BY SUM(oi.quantity * oi.unit_price) DESC LIMIT 1"),
        ("priciest_in_category", [{"category": c} for c in CATEGORIES],
         "What is the most expensive product in the {category} category?",
         "SELECT name FROM products WHERE category = '{category}' ORDER BY price DESC LIMIT 1"),
        ("big_orders_store", [{**s, "n": n} for s in stores for n in range(5, 11)],
         "How many orders at the {store} store contained more than {n} items in total quantity?",
         "SELECT COUNT(*) FROM (SELECT o.id FROM " + _ITEMS + " JOIN stores s ON s.id = o.store_id "
         "WHERE s.name = '{store}' GROUP BY o.id HAVING SUM(oi.quantity) > {n})"),
        ("spend_by_area", [{"area": a} for a in AREAS],
         "What is the total amount spent by customers who live in {area}?",
         f"SELECT SUM(oi.quantity * oi.unit_price) FROM {_ITEMS} JOIN customers c ON c.id = o.customer_id "
         "WHERE c.area = '{area}'"),
        ("joined_in_month", months,
         "How many customers joined in {month} 2026?",
         "SELECT COUNT(*) FROM customers WHERE joined_on LIKE '2026-{mm}-%'"),
    ]


def build(db_path: Path = settings.bench_db_path, test_fraction: float = 0.3, seed: int = 11) -> dict:
    rng = random.Random(seed)
    conn = sqlite3.connect(db_path)
    train, test = [], []
    for tid, combos, q_fmt, sql_fmt in _templates():
        items = []
        for i, params in enumerate(combos):
            sql = sql_fmt.format(**params)
            rows = conn.execute(sql).fetchall()
            if not rows or all(v is None for v in rows[0]):
                continue  # skip questions whose answer would be empty
            items.append({"id": f"{tid}-{i}", "template": tid, "question": q_fmt.format(**params), "sql": sql})
        rng.shuffle(items)
        n_test = max(1, round(len(items) * test_fraction))
        test += items[:n_test]
        train += items[n_test:]
    conn.close()
    rng.shuffle(train)
    data = {"train": train, "test": test}
    QUESTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    QUESTIONS_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def load() -> dict:
    if not QUESTIONS_PATH.exists():
        return build()
    return json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))


if __name__ == "__main__":
    data = build()
    print(f"train={len(data['train'])} test={len(data['test'])} -> {QUESTIONS_PATH}")
