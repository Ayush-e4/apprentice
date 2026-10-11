"""Razorpay Standard Checkout: create an order, then verify the payment signature.

Keys come from .env (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET). Only the key id is ever
sent to the browser. Use rzp_test_ keys for the demo; no real money moves in test mode.
"""

import hashlib
import hmac
import os
import time

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from . import config  # noqa: F401  (loads .env)

ORDERS_URL = "https://api.razorpay.com/v1/orders"
MIN_AMOUNT = 100  # paise, Razorpay's minimum
MAX_AMOUNT = 5_000_000  # paise (Rs 50,000), a sanity cap for the demo

router = APIRouter()


def _keys() -> tuple[str, str]:
    return (
        os.getenv("RAZORPAY_KEY_ID", "").strip(),
        os.getenv("RAZORPAY_KEY_SECRET", "").strip(),
    )


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


@router.get("/api/payments/config")
def payments_config():
    key_id, secret = _keys()
    return {
        "enabled": bool(key_id and secret),
        "key_id": key_id,
        "test_mode": key_id.startswith("rzp_test_"),
    }


@router.post("/api/create-order")
async def create_order(request: Request):
    key_id, secret = _keys()
    if not (key_id and secret):
        return _error(500, "Razorpay keys are not set in .env")
    try:
        body = await request.json()
    except ValueError:
        return _error(400, "body must be JSON")

    amount = body.get("amount")
    if not isinstance(amount, int) or isinstance(amount, bool):
        return _error(400, "amount must be an integer number of paise")
    if amount < MIN_AMOUNT:
        return _error(400, f"amount must be at least {MIN_AMOUNT} paise")
    if amount > MAX_AMOUNT:
        return _error(400, f"amount must be at most {MAX_AMOUNT} paise")

    payload = {
        "amount": amount,
        "currency": str(body.get("currency") or "INR"),
        "receipt": str(body.get("receipt") or f"apprentice-{int(time.time() * 1000)}")[:40],
        "notes": {k: str(v)[:256] for k, v in (body.get("notes") or {}).items()}
        if isinstance(body.get("notes"), dict) else {},
    }
    try:
        r = await request.app.state.client.post(
            ORDERS_URL, json=payload, auth=(key_id, secret), timeout=20
        )
    except httpx.HTTPError as e:
        return _error(500, f"could not reach Razorpay: {type(e).__name__}")
    if r.status_code == 401:
        return _error(401, "Razorpay rejected the API keys")
    if r.status_code >= 400:
        detail = r.json().get("error", {}).get("description", r.text) if r.content else r.text
        return _error(500, f"Razorpay error: {detail}")

    order = r.json()
    return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"]}


@router.post("/api/verify-payment")
async def verify_payment(request: Request):
    _, secret = _keys()
    if not secret:
        return _error(500, "Razorpay keys are not set in .env")
    try:
        body = await request.json()
    except ValueError:
        return _error(400, "body must be JSON")

    fields = ("razorpay_order_id", "razorpay_payment_id", "razorpay_signature")
    missing = [f for f in fields if not isinstance(body.get(f), str) or not body.get(f)]
    if missing:
        return _error(400, f"missing fields: {', '.join(missing)}")

    message = f"{body['razorpay_order_id']}|{body['razorpay_payment_id']}".encode()
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, body["razorpay_signature"]):
        return _error(400, "signature mismatch; payment not verified")

    return {
        "verified": True,
        "order_id": body["razorpay_order_id"],
        "payment_id": body["razorpay_payment_id"],
    }
