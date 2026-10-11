"""Hinglish versions of the benchmark questions, from a small hand-written phrasebook.

Users in Mumbai often mix Hindi and English, and the v1 SQL judge approved a wrong
answer to a Hinglish question. Each of the 16 templates in bench/questions.py has one
Hinglish phrasing here; literals (store, month, area, ...) stay as they are, so the
gold SQL is unchanged. Deterministic: no model calls.
"""

import random

from .questions import _templates

PHRASEBOOK = {
    "orders_at_store": "{store} store pe kitne orders place hue?",
    "revenue_store_month": "{month} 2026 mein {store} store ka total revenue kitna tha?",
    "top_category_month": "{month} 2026 mein kis product category ne sabse zyada revenue kamaya?",
    "top_products_store": "{store} store pe quantity ke hisaab se top 3 products kaun se hain?",
    "customers_in_area": "{area} mein kitne customers rehte hain?",
    "avg_order_value": "{store} store pe {payment} se pay hue orders ki average order value kya hai?",
    "busiest_store_month": "{month} 2026 mein kis store pe sabse zyada orders aaye?",
    "orders_payment_store": "{store} store pe kitne orders ka payment {payment} se hua?",
    "top_customer_area": "{area} mein rehne wale kis customer ne total sabse zyada paisa kharch kiya hai?",
    "units_of_product": "{product} ke total kitne units bik chuke hain?",
    "customers_category_month": "{month} 2026 mein kitne alag-alag customers ne {category} products kharide?",
    "best_month_store": "2026 ke kis mahine mein (month number batao) {store} store ka revenue sabse zyada tha?",
    "priciest_in_category": "{category} category mein sabse mehenga product kaun sa hai?",
    "big_orders_store": "{store} store pe kitne orders mein total quantity {n} items se zyada thi?",
    "spend_by_area": "{area} mein rehne wale customers ne total kitna paisa kharch kiya hai?",
    "joined_in_month": "{month} 2026 mein kitne customers ne join kiya?",
}


def _params() -> dict[str, list[dict]]:
    return {tid: combos for tid, combos, _, _ in _templates()}


def translate(item: dict) -> dict:
    """The Hinglish twin of a benchmark question: same template, parameters and gold SQL."""
    tid, index = item["id"].rsplit("-", 1)
    params = _params()[tid][int(index)]
    return {**item, "id": f"{item['id']}-hi", "question": PHRASEBOOK[tid].format(**params), "lang": "hinglish"}


def translate_all(items: list[dict]) -> list[dict]:
    return [translate(item) for item in items]


def pick(items: list[dict], per_template: int, seed: int = 7) -> list[dict]:
    """Up to `per_template` questions of each template, sampled with a fixed seed (deterministic)."""
    rng = random.Random(seed)
    by_template: dict[str, list[dict]] = {}
    for item in sorted(items, key=lambda i: (i["template"], int(i["id"].rsplit("-", 1)[1]))):
        by_template.setdefault(item["template"], []).append(item)
    out = []
    for tid in sorted(by_template):
        group = by_template[tid]
        out += rng.sample(group, min(per_template, len(group)))
    return out
