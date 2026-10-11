"""Builds a synthetic sales database for a chain of Mumbai grocery stores.

Run:  python -m bench.shopdb
"""

import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

from apprentice.config import settings

SCHEMA = """CREATE TABLE stores (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT NOT NULL
);
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL
);
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    joined_on TEXT NOT NULL  -- 'YYYY-MM-DD'
);
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_date TEXT NOT NULL,  -- 'YYYY-MM-DD'
    payment_method TEXT NOT NULL  -- 'UPI', 'Cash' or 'Card'
);
CREATE TABLE order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL
);"""

STORES = [
    ("Andheri West", "Andheri"),
    ("Bandra Linking Road", "Bandra"),
    ("Dadar TT", "Dadar"),
    ("Thane Station", "Thane"),
    ("Powai Lake", "Powai"),
    ("Colaba Causeway", "Colaba"),
]

PRODUCTS = {
    "Snacks": [("Parle-G Biscuits", 10), ("Haldiram Bhujia", 55), ("Lays Classic", 20), ("Kurkure Masala", 20)],
    "Beverages": [("Amul Taaza Milk 1L", 68), ("Tata Tea Gold 500g", 285), ("Bisleri 1L", 20), ("Frooti 600ml", 35)],
    "Staples": [("Aashirvaad Atta 5kg", 265), ("India Gate Basmati 1kg", 145), ("Tata Salt 1kg", 28), ("Toor Dal 1kg", 160)],
    "Dairy": [("Amul Butter 100g", 58), ("Amul Cheese Slices", 145), ("Mother Dairy Dahi 400g", 45), ("Amul Paneer 200g", 90)],
    "Personal Care": [("Dove Soap", 55), ("Colgate Toothpaste", 95), ("Clinic Plus Shampoo", 120), ("Dettol Handwash", 99)],
}

AREAS = ["Andheri", "Bandra", "Dadar", "Thane", "Powai", "Colaba", "Borivali", "Kurla"]
PAYMENTS = ["UPI", "Cash", "Card"]
FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Ishaan", "Rohan", "Kabir", "Arjun", "Sai", "Om", "Yash",
    "Ananya", "Diya", "Saanvi", "Priya", "Neha", "Kavya", "Meera", "Pooja", "Riya", "Sneha",
]
LAST_NAMES = ["Sharma", "Patil", "Mehta", "Iyer", "Shah", "Desai", "Kulkarni", "Joshi", "Naik", "Khan"]

START = date(2026, 1, 1)
END = date(2026, 9, 30)


def _random_day(rng: random.Random, start: date = START) -> str:
    return (start + timedelta(days=rng.randrange((END - start).days + 1))).isoformat()


def build(path: Path = settings.bench_db_path, seed: int = 7) -> Path:
    rng = random.Random(seed)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA)

    conn.executemany("INSERT INTO stores (name, area) VALUES (?, ?)", STORES)
    conn.executemany(
        "INSERT INTO products (name, category, price) VALUES (?, ?, ?)",
        [(name, cat, price) for cat, items in PRODUCTS.items() for name, price in items],
    )

    customers = set()
    while len(customers) < 300:
        initial = chr(ord("A") + rng.randrange(26))
        customers.add(f"{rng.choice(FIRST_NAMES)} {initial}. {rng.choice(LAST_NAMES)}")
    conn.executemany(
        "INSERT INTO customers (name, area, joined_on) VALUES (?, ?, ?)",
        [(name, rng.choice(AREAS), _random_day(rng, date(2025, 10, 1))) for name in sorted(customers)],
    )

    prices = dict(conn.execute("SELECT id, price FROM products").fetchall())
    for order_id in range(1, 3001):
        conn.execute(
            "INSERT INTO orders (id, store_id, customer_id, order_date, payment_method) VALUES (?, ?, ?, ?, ?)",
            (
                order_id,
                rng.randint(1, len(STORES)),
                rng.randint(1, 300),
                _random_day(rng),
                rng.choices(PAYMENTS, weights=[6, 3, 1])[0],
            ),
        )
        for product_id in rng.sample(sorted(prices), rng.randint(1, 4)):
            conn.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                (order_id, product_id, rng.randint(1, 5), prices[product_id]),
            )

    conn.commit()
    conn.close()
    return path


if __name__ == "__main__":
    print(f"Built {build()}")
