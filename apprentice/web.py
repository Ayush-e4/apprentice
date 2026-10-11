"""The gateway serves APIs only; the UI is the Next.js app in web/.

Old page URLs redirect to their pages in the web app, so existing links keep
working. WEB_URL is where the web app runs (default http://localhost:3100).
"""

import os

from fastapi import APIRouter
from fastapi.responses import RedirectResponse

PAGES = {"/": "/", "/dashboard": "/dashboard", "/shop": "/kirana", "/kirana": "/kirana", "/support": "/support"}

router = APIRouter()


def web_url() -> str:
    return os.getenv("WEB_URL", "http://localhost:3100").rstrip("/")


def _redirect(target: str):
    def handler() -> RedirectResponse:
        return RedirectResponse(web_url() + target, status_code=307)

    return handler


for path, target in PAGES.items():
    router.add_api_route(path, _redirect(target), methods=["GET"], include_in_schema=False)
